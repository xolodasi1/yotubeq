import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateVideoTitle(description: string, category: string) {
  try {
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
