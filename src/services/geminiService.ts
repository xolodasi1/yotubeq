import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateVideoTitle(description: string, category: string) {
  try {
    const ai = getAI();
    const prompt = `Сгенерируй привлекательное и кликабельное название для видео на YouTube. 
    Категория: ${category}. 
    Описание: ${description}. 
    Название должно быть коротким, интригующим и на русском языке. Выдай только один вариант названия без лишнего текста.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text?.trim().replace(/^"|"$/g, '') || "Без названия";
  } catch (error) {
    console.error("Error generating title:", error);
    throw error;
  }
}

export async function generateVideoDescription(title: string, category: string) {
  try {
    const ai = getAI();
    const prompt = `Напиши подробное и интересное описание для видео на YouTube под названием "${title}". 
    Категория: ${category}. 
    Описание должно включать краткий обзор видео, призыв к действию (подписаться, поставить лайк) и несколько релевантных хештегов. 
    Язык: русский. Выдай только текст описания.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Error generating description:", error);
    throw error;
  }
}

export async function generateVideoTags(title: string, description: string, category: string) {
  try {
    const ai = getAI();
    const prompt = `Сгенерируй список из 5-10 релевантных тегов для видео на YouTube под названием "${title}". 
    Категория: ${category}. 
    Описание: ${description}. 
    Выдай теги через запятую, без лишнего текста.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Error generating tags:", error);
    throw error;
  }
}

export async function generateImage(prompt: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
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
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}
