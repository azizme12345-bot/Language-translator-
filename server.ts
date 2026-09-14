import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

// In-memory cache to eliminate redundant API requests
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

function getCacheKey(text: string, src: string, tgt: string): string {
  return `${src.toLowerCase().trim()}:::${tgt.toLowerCase().trim()}:::${text.trim()}`;
}

function setCache(key: string, value: string) {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, value);
}

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Ordered list of models to try (starts with flash-lite for fastest response and highest availability)
const MODELS = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // Cloud Run and deployment health check endpoints
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/_ah/health", (req, res) => {
    res.status(200).send("ok");
  });

  // API route for translation
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, sourceLang, targetLang } = req.body;
      
      if (!text || !targetLang) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const cleanText = text.trim();
      const cleanSource = sourceLang || "Auto-detect";
      const cleanTarget = targetLang;

      // Check cache first
      const cacheKey = getCacheKey(cleanText, cleanSource, cleanTarget);
      if (translationCache.has(cacheKey)) {
        return res.json({ translatedText: translationCache.get(cacheKey) });
      }

      const ai = getAi();
      const prompt = `You are a highly capable and accurate multilingual translator.
Translate the following text from ${cleanSource} to ${cleanTarget}.
Respond ONLY with the translated text, do not add any conversational filler, markdown formatting or explanations.

Text to translate:
${cleanText}`;

      let translatedText: string | null = null;
      let lastError: any = null;

      for (const modelName of MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });

          if (response.text) {
            translatedText = response.text.trim();
            break;
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          console.warn(`Model ${modelName} failed, status:`, modelErr?.status || modelErr?.message?.slice?.(0, 100));
          // If quota or rate limited (429) or unavailable (503), try next model
          continue;
        }
      }

      if (translatedText !== null) {
        setCache(cacheKey, translatedText);
        return res.json({ translatedText });
      }

      // If all candidate models failed
      console.error("All translation models failed. Last error:", lastError);
      const isQuotaError =
        lastError?.status === 429 ||
        lastError?.message?.includes("429") ||
        lastError?.message?.includes("RESOURCE_EXHAUSTED") ||
        lastError?.message?.includes("quota");

      if (isQuotaError) {
        return res.status(429).json({
          error: "Translation quota temporarily reached. Please wait a moment before trying again.",
        });
      }

      return res.status(500).json({
        error: "Translation service encountered an issue. Please try again in a few moments.",
      });
    } catch (error: any) {
      console.error("Translation route error:", error);
      res.status(500).json({
        error: error?.message || "Failed to translate text",
      });
    }
  });

  // Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const candidateDirs = [
      path.join(process.cwd(), "dist"),
      path.join(__dirname, "..", "dist"),
      __dirname,
    ];
    const distPath = candidateDirs.find((dir) => fs.existsSync(path.join(dir, "index.html"))) || candidateDirs[0];

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "Endpoint not found" });
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("<!doctype html><html><head><title>Easy Translate</title></head><body><div id='root'></div></body></html>");
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

startServer();
