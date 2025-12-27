import { GoogleGenAI } from "@google/genai";
import { Resource } from "../types";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

export async function getGeminiChatResponse(
  userPrompt: string,
  resources: Resource[]
) {
  try {
    const compactResources = resources.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are a helpful campus assistant.

User query:
"${userPrompt}"

Available resources:
${JSON.stringify(compactResources, null, 2)}

Rules:
- If nothing matches, return an empty array.
- ALWAYS return valid JSON.
- DO NOT add explanations outside JSON.

Return format:
{
  "reply": "short message for the user",
  "matches": [
    {
      "resourceId": "id",
      "reason": "why it matches"
    }
  ]
}
`,
            },
          ],
        },
      ],
    });

   let raw = response.text;

// 🔥 Remove ```json and ``` if present
raw = raw
  .replace(/```json/gi, "")
  .replace(/```/g, "")
  .trim();

let parsed: any;

try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.warn("Gemini returned invalid JSON:", raw);
  parsed = null;
}


    // ✅ Always return safe structure
    if (!parsed || typeof parsed !== "object") {
      return {
        reply: "No relevant resources found.",
        matches: [],
      };
    }

    return {
      reply:
        typeof parsed.reply === "string"
          ? parsed.reply
          : "Here are some results.",
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    };
  } catch (err) {
    console.error("Gemini error:", err);

    return {
      reply: "Unable to fetch results right now.",
      matches: [],
    };
  }
}
