import { GoogleGenAI } from "@google/genai";

function stripCodeFence(value) {
  return (value || "").replace(/```json|```/gi, "").trim();
}

function extractJsonObject(value) {
  const cleaned = stripCodeFence(value);

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Le modele n a pas renvoye un JSON valide.");
  }
}

function normalizeMessage(message) {
  const role = message.role === "assistant" ? "model" : "user";

  return {
    role,
    parts: [{ text: String(message.content || "") }],
  };
}

function extractGeminiText(response) {
  if (!response) {
    throw new Error("Reponse Gemini vide.");
  }

  if (typeof response.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  if (typeof response.text === "function") {
    const textValue = response.text();
    if (typeof textValue === "string" && textValue.trim()) {
      return textValue.trim();
    }
  }

  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts) && parts.length) {
    const joined = parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();

    if (joined) {
      return joined;
    }
  }

  throw new Error("Reponse Gemini vide.");
}

function buildApiKeyClient(apiKey) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquant.");
  }

  return new GoogleGenAI({ apiKey });
}

export async function callGeminiJson({
  model,
  apiKey,
  system,
  history = [],
  user,
  temperature = 0.7,
  maxOutputTokens = 1024,
}) {
  const contents = [...history.map(normalizeMessage), { role: "user", parts: [{ text: user }] }];

  const ai = buildApiKeyClient(apiKey);
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: system,
      temperature,
      maxOutputTokens,
      responseMimeType: "application/json",
    },
  });

  const rawText = extractGeminiText(response);

  return extractJsonObject(rawText);
}

export function clampScore(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}