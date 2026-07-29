import { Express } from "express";
import OpenAI from "openai";
import { createCddEntry, updateCddEntry, getCddEntries, getCddEntryByToken } from "./db";
import { nanoid } from "nanoid";

export function registerCddApi(app: Express) {
  // OCR Endpoint
  app.post("/api/cdd/extract", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ error: "Image required" });

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
              { type: "text", text: "Extract details from this ID. Output JSON only." },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      res.json(JSON.parse(content || "{}"));
    } catch (err: any) {
      console.error("OCR Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Registration Endpoint
  app.post("/api/cdd/register", async (req, res) => {
    try {
      const entry = await createCddEntry({
        ...req.body,
        status: req.body.status || "direct"
      });
      res.json({ success: true, entry });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SMS Explainer Endpoint
  app.post("/api/cdd/send-explainer", async (req, res) => {
    try {
      const { propertyId, phone } = req.body;
      const token = nanoid();
      await createCddEntry({ propertyId, phone, status: "sent", token });

      const baseUrl = process.env.BASE_URL || `https://${req.get("host")}`;
      const explainerUrl = `${baseUrl}/cdd?token=${token}`;
      
      const username = process.env.CLICKSEND_USERNAME;
      const apiKey = process.env.CLICKSEND_API_KEY;
      
      if (username && apiKey) {
        const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");
        await fetch("https://rest.clicksend.com/v3/sms/send", {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ to: phone, body: `Identity verification for ${propertyId}: ${explainerUrl}`, source: "buyersbrief" }]
          }),
        });
      }

      res.json({ success: true, explainerUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Register (for agent view)
  app.get("/api/cdd/list", async (req, res) => {
    try {
      const entries = await getCddEntries();
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
