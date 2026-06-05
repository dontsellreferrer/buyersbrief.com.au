import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { createSessionToken } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createBrief,
  createCma,
  createHotlistEntry,
  createUser,
  getBriefById,
  getBriefsByUserId,
  getCmaBySlug,
  getHotlistByUserId,
  getLatestBriefByUserId,
  getMatchById,
  getMatchesByBriefId,
  getUserByEmail,
  removeHotlistEntry,
  updateBrief,
  updateHotlistEntry,
  updateLastSignedIn,
  updateUserNotificationPrefs,
  updateUserTier,
} from "./db";
import { generateAISearchMatchesForBrief, runAISearchForBrief, saveAISearchMatchesForBrief, type AISearchMatchPayload } from "./services/search";
import type { Brief } from "../drizzle/schema";

const nullableString = z.string().trim().optional().nullable();
const purchaseIntentSchema = z.enum(["live", "invest", "both"]);
const tierSchema = z.enum(["free", "tier1", "tier2", "tier3"]);
const listInputSchema = z.union([z.array(z.string()), z.string()]).optional().nullable();

const briefInputSchema = z.object({
  suburb: nullableString,
  suburbs: listInputSchema,
  propertyType: nullableString,
  type: nullableString,
  beds: nullableString,
  baths: nullableString,
  parking: nullableString,
  budget: z.union([z.string(), z.number()]).optional().nullable(),
  budgetDisplay: nullableString,
  intent: purchaseIntentSchema.optional(),
  purchaseIntent: purchaseIntentSchema.optional(),
  flex: nullableString,
  radiusKm: z.number().int().positive().optional().nullable(),
  nonNegotiables: listInputSchema,
  needs: listInputSchema,
  wants: listInputSchema,
  niceToHaves: listInputSchema,
  story: nullableString,
  buyerStory: nullableString,
  finance: nullableString,
  financeStatus: nullableString,
  timeline: nullableString,
  landMinM2: z.number().int().positive().optional().nullable(),
});

function normalizeList(value: z.infer<typeof listInputSchema>): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => item.trim()).filter(Boolean);
    return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
  }
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeSuburbs(input: Partial<z.infer<typeof briefInputSchema>>): string | null {
  if (input.suburbs) return normalizeList(input.suburbs);
  return input.suburb?.trim() || null;
}

function parseBudget(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const numeric = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function makeBudgetDisplay(value: string | number | null | undefined, parsed: number | null): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number") return `$${value.toLocaleString("en-AU")}`;
  return parsed ? `$${parsed.toLocaleString("en-AU")}` : null;
}

function buildBriefRecord(input: z.infer<typeof briefInputSchema>) {
  const parsedBudget = parseBudget(input.budget ?? input.budgetDisplay);
  return {
    suburbs: normalizeSuburbs(input),
    type: input.propertyType || input.type || null,
    beds: input.beds || null,
    baths: input.baths || null,
    parking: input.parking || null,
    budget: parsedBudget,
    budgetDisplay: makeBudgetDisplay(input.budgetDisplay ?? input.budget, parsedBudget),
    purchaseIntent: input.intent || input.purchaseIntent || "live",
    flex: input.flex || null,
    radiusKm: input.radiusKm ?? null,
    nonNegotiables: normalizeList(input.nonNegotiables),
    needs: normalizeList(input.needs),
    wants: normalizeList(input.wants),
    niceToHaves: normalizeList(input.niceToHaves),
    story: input.buyerStory || input.story || null,
    finance: input.financeStatus || input.finance || null,
    financeStatus: input.financeStatus || input.finance || null,
    timeline: input.timeline || null,
    landMinM2: input.landMinM2 ?? null,
    status: "active" as const,
    tier: "free" as const,
  };
}

function makePreviewBrief(input: z.infer<typeof briefInputSchema>): Brief {
  const now = new Date();
  return {
    id: 0,
    userId: 0,
    ...buildBriefRecord(input),
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

const previewMatchSchema = z.object({
  address: z.string().min(1),
  suburb: nullableString,
  state: nullableString,
  postcode: nullableString,
  propertyType: nullableString,
  bedrooms: z.number().int().nullable().optional(),
  bathrooms: z.number().int().nullable().optional(),
  parking: nullableString,
  landSizeM2: z.number().int().nullable().optional(),
  price: z.number().int().nullable().optional(),
  priceDisplay: nullableString,
  daysOnMarket: z.number().int().nullable().optional(),
  listingStatus: z.enum(["active", "price_drop", "under_offer", "off_market", "sold"]).optional(),
  listingUrl: nullableString,
  score: z.number().int().min(0).max(100).optional(),
  scoreBreakdown: z.record(z.string(), z.unknown()).nullable().optional(),
  liamNote: nullableString,
  rawJson: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(["new", "hotlisted", "rejected", "purchased"]).optional(),
});

function normalizePreviewMatch(match: z.infer<typeof previewMatchSchema>): AISearchMatchPayload {
  return {
    address: match.address,
    suburb: match.suburb ?? null,
    state: match.state || "NSW",
    postcode: match.postcode ?? null,
    propertyType: match.propertyType ?? null,
    bedrooms: match.bedrooms ?? null,
    bathrooms: match.bathrooms ?? null,
    parking: match.parking ?? null,
    landSizeM2: match.landSizeM2 ?? null,
    price: match.price ?? null,
    priceDisplay: match.priceDisplay ?? null,
    daysOnMarket: match.daysOnMarket ?? null,
    listingStatus: match.listingStatus ?? "active",
    listingUrl: match.listingUrl ?? null,
    score: match.score ?? 0,
    scoreBreakdown: match.scoreBreakdown ?? {},
    liamNote: match.liamNote ?? null,
    rawJson: match.rawJson ?? {},
    status: match.status ?? "new",
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "property";
}

function ensureCurrentUser(ctx: { user: { id: number } | null }) {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return ctx.user;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    signup: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8, "Password must be at least 8 characters"),
          firstName: z.string().min(1, "First name is required"),
          lastName: z.string().optional(),
          mobile: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const user = await createUser({
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
          mobile: input.mobile ?? null,
        });

        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create account. Please try again.",
          });
        }

        const token = await createSessionToken(user.id, user.email);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tier: user.tier,
          },
        };
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1, "Password is required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        await updateLastSignedIn(user.id);

        const token = await createSessionToken(user.id, user.email);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tier: user.tier,
          },
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  brief: router({
    create: protectedProcedure
      .input(briefInputSchema)
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const brief = await createBrief({
          userId: user.id,
          ...buildBriefRecord(input),
        });

        if (!brief) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save buyer brief" });
        }

        return { success: true, brief };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), data: briefInputSchema.partial() }))
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const parsedBudget = parseBudget(input.data.budget ?? input.data.budgetDisplay);
        const suburbs = normalizeSuburbs(input.data);
        const brief = await updateBrief(input.id, user.id, {
          ...(suburbs ? { suburbs } : {}),
          ...(input.data.propertyType || input.data.type ? { type: input.data.propertyType || input.data.type || null } : {}),
          ...(input.data.beds ? { beds: input.data.beds } : {}),
          ...(input.data.baths ? { baths: input.data.baths } : {}),
          ...(input.data.parking ? { parking: input.data.parking } : {}),
          ...(parsedBudget ? { budget: parsedBudget, budgetDisplay: makeBudgetDisplay(input.data.budgetDisplay ?? input.data.budget, parsedBudget) } : {}),
          ...(input.data.intent || input.data.purchaseIntent ? { purchaseIntent: input.data.intent || input.data.purchaseIntent || "live" } : {}),
          ...(input.data.flex ? { flex: input.data.flex } : {}),
          ...(input.data.nonNegotiables ? { nonNegotiables: normalizeList(input.data.nonNegotiables) } : {}),
          ...(input.data.needs ? { needs: normalizeList(input.data.needs) } : {}),
          ...(input.data.wants ? { wants: normalizeList(input.data.wants) } : {}),
          ...(input.data.niceToHaves ? { niceToHaves: normalizeList(input.data.niceToHaves) } : {}),
          ...(input.data.buyerStory || input.data.story ? { story: input.data.buyerStory || input.data.story || null } : {}),
          ...(input.data.financeStatus || input.data.finance ? { finance: input.data.financeStatus || input.data.finance || null, financeStatus: input.data.financeStatus || input.data.finance || null } : {}),
          ...(input.data.timeline ? { timeline: input.data.timeline } : {}),
        });

        if (!brief) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
        }

        return { success: true, brief, staleCount: 0, staleProperties: [] as unknown[] };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const user = ensureCurrentUser(ctx);
      return getBriefsByUserId(user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const brief = await getBriefById(input.id, user.id);
        if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
        return brief;
      }),
  }),

  search: router({
    preview: publicProcedure
      .input(briefInputSchema)
      .mutation(async ({ input }) => {
        const brief = makePreviewBrief(input);
        const matches = await generateAISearchMatchesForBrief(brief);
        return { success: true, brief, matches };
      }),

    savePreview: protectedProcedure
      .input(z.object({
        briefId: z.number().int().positive(),
        matches: z.array(previewMatchSchema).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const brief = await getBriefById(input.briefId, user.id);
        if (!brief) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
        }
        const matches = await saveAISearchMatchesForBrief(brief, input.matches.map(normalizePreviewMatch));
        return { success: true, brief, matches };
      }),

    run: protectedProcedure
      .input(z.object({ briefId: z.number().int().positive().optional() }).optional())
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const brief = input?.briefId
          ? await getBriefById(input.briefId, user.id)
          : await getLatestBriefByUserId(user.id);

        if (!brief) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No buyer brief found to search against" });
        }

        try {
          const matches = await runAISearchForBrief(brief);
          return { success: true, brief, matches };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Search generation failed';
          if (message.includes('No direct LLM provider is configured')) {
            console.warn('[Search] AI provider is not configured; returning an empty match set for dashboard handoff');
            return { success: false, brief, matches: [], message };
          }
          throw error;
        }
      }),

    matches: protectedProcedure
      .input(z.object({ briefId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        return getMatchesByBriefId(input.briefId, user.id);
      }),
  }),

  dashboard: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const user = ensureCurrentUser(ctx);
      const briefs = await getBriefsByUserId(user.id);
      const activeBrief = briefs[0] || null;
      const matches = activeBrief ? await getMatchesByBriefId(activeBrief.id, user.id) : [];
      const hotlist = await getHotlistByUserId(user.id);

      return {
        user: ctx.user,
        activeBrief,
        briefs,
        matches,
        hotlist,
      };
    }),
  }),

  hotlist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const user = ensureCurrentUser(ctx);
      return getHotlistByUserId(user.id);
    }),

    add: protectedProcedure
      .input(z.object({ matchId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const match = await getMatchById(input.matchId, user.id);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });

        const entry = await createHotlistEntry({
          userId: user.id,
          matchId: match.id,
          lastPrice: match.price ?? null,
          status: "active",
        });

        if (!entry) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add property to hotlist" });
        }
        return { success: true, entry };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        inspectionNote: nullableString,
        tier3Requested: z.boolean().optional(),
        tier3MaxPrice: z.number().int().positive().optional().nullable(),
        tier2Requested: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const entry = await updateHotlistEntry(input.id, user.id, {
          inspectionNote: input.inspectionNote ?? undefined,
          tier3Requested: input.tier3Requested,
          tier3MaxPrice: input.tier3MaxPrice ?? undefined,
          tier2Requested: input.tier2Requested,
        });
        if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Hotlist entry not found" });
        return { success: true, entry };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const success = await removeHotlistEntry(input.id, user.id);
        return { success };
      }),
  }),

  cma: router({
    generate: protectedProcedure
      .input(z.object({ hotlistId: z.number().int().positive(), address: z.string().min(1), suburb: z.string().optional() }))
      .mutation(async ({ input }) => {
        const addressSlug = slugify(input.address);
        const suburbSlug = slugify(input.suburb || input.address.split(",").slice(-2, -1)[0] || "property");
        const cma = await createCma({
          hotlistId: input.hotlistId,
          address: input.address,
          suburbSlug,
          addressSlug,
          confidence: "medium",
          cmaData: {
            address: input.address,
            summary: "Initial CMA placeholder generated from the hotlisted property context. Full comparable-sales enrichment can be attached to this record as provider integrations are added.",
            generatedBy: "buyersbrief-direct-backend",
          },
        });
        if (!cma) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate CMA" });
        return { success: true, cma, url: `/cma/${suburbSlug}/${addressSlug}` };
      }),

    bySlug: publicProcedure
      .input(z.object({ suburbSlug: z.string().min(1), addressSlug: z.string().min(1) }))
      .query(async ({ input }) => {
        const cma = await getCmaBySlug(input.suburbSlug, input.addressSlug);
        if (!cma) throw new TRPCError({ code: "NOT_FOUND", message: "CMA not found" });
        return cma;
      }),
  }),

  subscription: router({
    get: protectedProcedure.query(({ ctx }) => {
      const user = ensureCurrentUser(ctx);
      return {
        tier: ctx.user?.tier || "free",
        userId: user.id,
      };
    }),

    updateTier: protectedProcedure
      .input(z.object({ tier: tierSchema }))
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const updated = await updateUserTier(user.id, input.tier);
        if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update tier" });
        return { success: true, tier: updated.tier };
      }),

    notifications: protectedProcedure
      .input(z.object({
        dailyEmail: z.boolean().optional(),
        hotSms: z.boolean().optional(),
        priceDrop: z.boolean().optional(),
        statusChange: z.boolean().optional(),
        weeklyDigest: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = ensureCurrentUser(ctx);
        const updated = await updateUserNotificationPrefs(user.id, input);
        if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update notification preferences" });
        return { success: true, notifications: updated.notifications };
      }),
  }),
});

export type AppRouter = typeof appRouter;
