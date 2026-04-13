import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in the environment");
  }

  const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

  // API Routes
  app.post("/api/generate-title", async (req, res) => {
    try {
      const { description, category } = req.body;
      const prompt = `Сгенерируй привлекательное и кликабельное название для видео на YouTube. 
      Категория: ${category}. 
      Описание: ${description}. 
      Название должно быть коротким, интригующим и на русском языке. Выдай только один вариант названия без лишнего текста.`;
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      res.json({ text: response.text?.trim().replace(/^"|"$/g, '') || "Без названия" });
    } catch (error: any) {
      console.error("Error generating title:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-description", async (req, res) => {
    try {
      const { title, category } = req.body;
      const prompt = `Напиши подробное и интересное описание для видео на YouTube под названием "${title}". 
      Категория: ${category}. 
      Описание должно включать краткий обзор видео, призыв к действию (подписаться, поставить лайк) и несколько релевантных хештегов. 
      Язык: русский. Выдай только текст описания.`;
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      res.json({ text: response.text?.trim() || "" });
    } catch (error: any) {
      console.error("Error generating description:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-tags", async (req, res) => {
    try {
      const { title, description, category } = req.body;
      const prompt = `Сгенерируй список из 5-10 релевантных тегов для видео на YouTube под названием "${title}". 
      Категория: ${category}. 
      Описание: ${description}. 
      Выдай теги через запятую, без лишнего текста.`;
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      res.json({ text: response.text?.trim() || "" });
    } catch (error: any) {
      console.error("Error generating tags:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });
      
      let imageData = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageData = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      
      if (imageData) {
        res.json({ imageUrl: imageData });
      } else {
        res.status(400).json({ error: "No image generated" });
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-music", async (req, res) => {
    try {
      const { prompt, isFullLength } = req.body;
      const model = isFullLength ? "lyria-3-pro-preview" : "lyria-3-clip-preview";
      
      const response = await genAI.models.generateContentStream({
        model: model,
        contents: prompt,
      });

      let audioBase64 = "";
      let lyrics = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      if (!audioBase64) {
        return res.status(400).json({ error: "No audio data generated" });
      }

      res.json({
        audioBase64,
        lyrics,
        mimeType
      });
    } catch (error: any) {
      console.error("Error generating music:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
