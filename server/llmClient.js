import { GoogleGenAI } from "@google/genai";

const apiClientCache = new Map();

function stripCodeFence(value) {
  return (value || "").replace(/```json|```/gi, "").trim();
}

function extractBalancedBlock(value, openingChar, closingChar) {
  const startIndex = value.indexOf(openingChar);
  if (startIndex === -1) {
    return "";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === openingChar) {
      depth += 1;
      continue;
    }

    if (char === closingChar) {
      depth -= 1;
      if (depth === 0) {
        return value.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

function normalizeJsonLikeText(value) {
  return value
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function parseCandidate(candidate) {
  if (!candidate) {
    return null;
  }

  try {
    return JSON.parse(candidate);
  } catch {
    // Continue with normalized variant.
  }

  const normalized = normalizeJsonLikeText(candidate);
  if (normalized !== candidate) {
    try {
      return JSON.parse(normalized);
    } catch {
      // Continue with next candidate.
    }
  }

  return null;
}

function extractJsonObject(value) {
  const cleaned = stripCodeFence(value);

  const candidates = [
    cleaned,
    extractBalancedBlock(cleaned, "{", "}"),
    extractBalancedBlock(cleaned, "[", "]"),
  ].filter(Boolean);

  const uniqueCandidates = [...new Set(candidates)];

  for (const candidate of uniqueCandidates) {
    const parsed = parseCandidate(candidate);
    if (!parsed) {
      continue;
    }

    if (Array.isArray(parsed)) {
      return {
        items: parsed,
        _raw_text: cleaned,
      };
    }

    if (typeof parsed === "object") {
      return parsed;
    }
  }

  return {
    _raw_text: cleaned,
  };
}

function normalizeMessage(message) {
  const role = message.role === "assistant" ? "model" : "user";

  return {
    role,
    parts: [{ text: String(message.content || "") }],
  };
}

function parseUpstreamErrorPayload(error) {
  if (error?.error && typeof error.error === "object") {
    return error.error;
  }

  const message = typeof error?.message === "string" ? error.message.trim() : "";
  if (!message || !message.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(message);
    if (parsed?.error && typeof parsed.error === "object") {
      return parsed.error;
    }
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function logGeminiRuntimeError(error, model) {
  const upstream = parseUpstreamErrorPayload(error);
  const details = Array.isArray(upstream?.details) ? upstream.details : [];
  const errorReason = details.find((detail) => typeof detail?.reason === "string")?.reason || "";

  console.error("[MirrorFight][GeminiAPI] Echec generateContent", {
    model,
    usingGoogleApiKeyFallback:
      !process.env.GEMINI_API_KEY && Boolean(String(process.env.GOOGLE_API_KEY || "").trim()),
    status: upstream?.status || error?.status || "",
    code: upstream?.code || error?.code || "",
    reason: errorReason,
    message: upstream?.message || error?.message || "Erreur inconnue",
  });
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

function buildApiKeyClient() {
  const resolvedApiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();

  if (!resolvedApiKey) {
    throw new Error("GEMINI_API_KEY manquant. Definis GEMINI_API_KEY (ou GOOGLE_API_KEY) dans le fichier .env.");
  }

  const cacheKey = "default";
  if (apiClientCache.has(cacheKey)) {
    return apiClientCache.get(cacheKey);
  }

  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  });

  apiClientCache.set(cacheKey, client);
  return client;
}

export async function callGeminiJson({
  model,
  system,
  history = [],
  user,
  temperature = 0.7,
  maxOutputTokens = 2048,
  debugLabel = "unknown",
}) {
  const resolvedModel = process.env.GEMINI_API_MODEL || model || "gemini-2.5-flash";
  const contents = [...history.map(normalizeMessage), { role: "user", parts: [{ text: user }] }];

  const ai = buildApiKeyClient();

  let response;
  try {
    response = await ai.models.generateContent({
      model: resolvedModel,
      contents,
      config: {
        systemInstruction: system,
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
      },
    });
  } catch (error) {
    logGeminiRuntimeError(error, resolvedModel);
    throw error;
  }

  const rawText = extractGeminiText(response);
  console.log("[MirrorFight][GeminiAPI] Raw response length", {
    label: debugLabel,
    model: resolvedModel,
    maxOutputTokens,
    rawTextLength: rawText.length,
  });

  const parsed = extractJsonObject(rawText);
  const perspectiveLength = typeof parsed?.perspective === "string" ? parsed.perspective.trim().length : 0;
  const responseLength = typeof parsed?.response === "string" ? parsed.response.trim().length : 0;

  console.log("[MirrorFight][GeminiAPI] Parsed field lengths", {
    label: debugLabel,
    perspectiveLength,
    responseLength,
  });

  return parsed;
}

export function clampScore(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}