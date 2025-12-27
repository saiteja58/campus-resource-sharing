
import { GoogleGenAI, Type } from "@google/genai";
import { Resource } from "../types";

// Always initialize with the named parameter apiKey using process.env.API_KEY directly
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartRecommendations = async (query: string, availableResources: Resource[]) => {
  // Create a new GoogleGenAI instance right before the call
  const ai = getAI();
  const context = availableResources.map(r => ({
    id: r.id,
    title: r.title,
    category: r.category,
    college: r.college
  }));

  // Recommending relevant items from a list is a complex task requiring reasoning, so we use gemini-3-pro-preview
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `User is searching for: "${query}". Based on these available resources in Hyderabad colleges: ${JSON.stringify(context)}, suggest the top 3 most relevant items. Return only valid JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            resourceId: { type: Type.STRING },
            reason: { type: Type.STRING, description: "Why this is recommended for the user's query" }
          },
          required: ["resourceId", "reason"]
        }
      }
    }
  });

  try {
    // response.text is a property, not a method. Using trim() and fallback.
    const text = response.text?.trim();
    return JSON.parse(text || "[]");
  } catch (e) {
    console.error("Failed to parse recommendations", e);
    return [];
  }
};

export const autoCategorize = async (title: string, description: string) => {
  // Create a new GoogleGenAI instance right before the call
  const ai = getAI();
  const prompt = `Resource Title: ${title}\nDescription: ${description}\nAssign one of these categories: Books, Notes, Lab Equipment, Electronics, Others. Respond with ONLY the category name.`;
  
  // Basic text task, using gemini-3-flash-preview
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  // response.text is a property, not a method. Added safe access.
  return response.text?.trim() || 'Others';
};

export const getSearchSuggestions = async (query: string) => {
  // Create a new GoogleGenAI instance right before the call
  const ai = getAI();
  const prompt = `The user is searching for "${query}" on a campus resource sharing platform. Suggest 5 related engineering topics or items they might be looking for in a college setting (e.g. specific subjects, lab gear). Return as a simple JSON array of strings.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    // response.text is a property, not a method
    const text = response.text?.trim();
    return JSON.parse(text || "[]");
  } catch (e) {
    return [];
  }
};
