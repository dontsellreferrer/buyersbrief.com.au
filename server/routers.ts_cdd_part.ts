
  cdd: router({
    extractId: publicProcedure
      .input(z.object({ image: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an OCR expert. Extract Full Name, Date of Birth (DD/MM/YYYY), and Address from the provided ID document. Output as JSON only. If a field is missing, use null. Provide a confidence score (0-1) for each field. Passports do not have addresses."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract the details from this ID. Please output .json file only - no other output required." },
                { type: "image_url", image_url: { url: input.image } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "OpenAI failed to return content" });
        return JSON.parse(content);
      }),

    register: publicProcedure
      .input(z.object({
        id: z.number().optional(),
        propertyId: z.string().min(1),
        agentName: z.string().optional(),
        documentType: z.string().optional(),
        fullName: z.string().optional(),
        dob: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        viewedOriginal: z.boolean().default(false),
        status: z.enum(["direct", "sent", "completed", "approved"]).default("direct"),
        token: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.id) {
          const entry = await updateCddEntry(input.id, input);
          return { success: true, entry };
        } else if (input.token) {
          const existing = await getCddEntryByToken(input.token);
          if (existing) {
            const entry = await updateCddEntry(existing.id, input);
            return { success: true, entry };
          }
        }
        const entry = await createCddEntry(input);
        return { success: true, entry };
      }),

    sendExplainer: publicProcedure
      .input(z.object({
        propertyId: z.string().min(1),
        phone: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const token = nanoid();
        await createCddEntry({
          propertyId: input.propertyId,
          phone: input.phone,
          status: "sent",
          token: token,
        });

        const explainerUrl = `${process.env.BASE_URL || "https://buymyplace.com.au"}/cdd/explainer?propertyId=${encodeURIComponent(input.propertyId)}&phone=${encodeURIComponent(input.phone)}&token=${token}`;
        
        // Clicksend SMS logic
        const username = process.env.CLICKSEND_USERNAME;
        const apiKey = process.env.CLICKSEND_API_KEY;
        if (username && apiKey) {
          const authToken = Buffer.from(`${username}:${apiKey}`).toString("base64");
          await fetch("https://rest.clicksend.com/v3/sms/send", {
            method: "POST",
            headers: {
              Authorization: `Basic ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [{
                to: input.phone,
                body: `Hi, to inspect the property at ${input.propertyId}, please view this identity verification explainer: ${explainerUrl}`,
                source: "buymyplace"
              }]
            }),
          });
        }

        return { success: true, explainerUrl };
      }),

    getRegister: publicProcedure
      .input(z.object({ propertyId: z.string().optional() }))
      .query(async ({ input }) => {
        return await getCddEntries(input.propertyId);
      }),

    approve: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const entry = await updateCddEntry(input.id, { status: "approved" });
        return { success: true, entry };
      }),

    getByToken: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const entry = await getCddEntryByToken(input.token);
        if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });
        return entry;
      }),
  }),
