# BuyersBrief Platform

BuyersBrief is a production React, Express, tRPC, and PostgreSQL application for buyer brief capture, AI-assisted property matching, dashboard review, saved-property hotlists, and CMA generation. The application is deployed from GitHub to Railway and uses Supabase PostgreSQL for persistence.

## Production Architecture

| Layer | Implementation | Notes |
|---|---|---|
| Frontend | React 19, Vite, Tailwind CSS | Built into `dist/public` and served by the Express backend. |
| Backend | Node.js, Express, tRPC | API traffic is exposed under `/api/trpc`. |
| Database | Supabase PostgreSQL via Drizzle ORM | Schema lives in `drizzle/schema.ts`; query helpers live in `server/db.ts`. |
| Authentication | Local email/password and JWT session cookie | Auth procedures are implemented in `server/routers.ts` and session helpers under `server/_core`. |
| AI search | Direct OpenAI API key | Provider logic lives in `server/services/search.ts` and `server/_core/llm.ts`. |
| Hosting | Railway | GitHub `main` pushes trigger production deployment. |
| DNS | Cloudflare | `buyersbrief.com.au` points to the Railway deployment. |

## Local Development

Install dependencies, run type checks, execute tests, and build before pushing production changes.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

For local development, run:

```bash
pnpm dev
```

## Required Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string. |
| `JWT_SECRET` | Session token signing secret. |
| `OPENAI_API_KEY` | AI search and CMA provider key. |
| `NODE_ENV` | Set to `production` in Railway. |

Additional commercial-service variables may be added as features are completed, including Stripe and ClickSend variables. Do not commit `.env` files or raw credentials.

## Key Project Files

| Path | Purpose |
|---|---|
| `client/src/App.tsx` | Frontend route registration. |
| `client/src/pages/` | Page-level UI for signup, dashboard, CMA, login, and account flows. |
| `client/src/components/` | Shared UI components and design-system primitives. |
| `client/src/lib/trpc.ts` | tRPC client binding. |
| `server/routers.ts` | Main tRPC API router for auth, briefs, dashboard, hotlist, and CMA. |
| `server/db.ts` | PostgreSQL query and persistence helpers. |
| `server/services/search.ts` | AI-assisted search and persisted match generation. |
| `server/_core/llm.ts` | Direct LLM provider helper. |
| `drizzle/schema.ts` | Database schema and inferred row types. |
| `RAILWAY_DEPLOYMENT_GUIDE.md` | Production deployment and environment guidance. |

## Production Deployment Workflow

Railway deploys production automatically from GitHub `main`. Before pushing, verify that the repository is clean and that all checks pass locally.

```bash
git status --short --branch
pnpm check
pnpm test
pnpm build
git add <changed-files>
git commit -m "Update ..."
git push
```

After pushing, verify the live site and any affected authenticated flows. If a deployment is unhealthy, use Railway deployment rollback or revert the Git commit.

## Database Workflow

Schema changes should be made deliberately and separately from UI-only changes. Update `drizzle/schema.ts`, generate migrations, apply them to Supabase using the approved production process, and only then deploy application code that depends on the new schema.

```bash
pnpm db:push
```

Always confirm that production environment variables and database migrations are in place before deploying code that depends on them.

## Development Rules

All application code should use local project services, direct configured provider APIs, and the approved Railway/Supabase production stack. Avoid adding platform-specific runtime packages, hidden debug collectors, credential-bearing documentation, or generated files that are not required by the production app.
