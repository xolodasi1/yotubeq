import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateVideoTitle(description: string, category: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Сгенерируй привлекательное и кликабельное название для видео на YouTube. 
    Категория: ${category}. 
    Описание: ${description}. 
    Название должно быть коротким, интригующим и на русском языке. Выдай только один вариант названия без лишнего текста.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error generating title:", error);
    throw error;
  }
}

export async function generateVideoDescription(title: string, category: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Напиши подробное и интересное описание для видео на YouTube под названием "${title}". 
    Категория: ${category}. 
    Описание должно включать краткий обзор видео, призыв к действию (подписаться, поставить лайк) и несколько релевантных хештегов. 
    Язык: русский. Выдай только текст описания.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating description:", error);
    throw error;
  }
}
