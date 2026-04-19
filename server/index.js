import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { buildDialoguePrompt, buildMirrorPrompt, buildSynthesisPrompt } from "./prompts.js";
import { callGeminiJson, clampScore } from "./llmClient.js";

dotenv.config({ override: true });

const app = express();
const PORT = Number(process.env.SERVER_PORT || 8787);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_API_MODEL = process.env.GEMINI_API_MODEL || "gemini-2.5-flash";

app.use(express.json({ limit: "1mb" }));

function parseJsonSafely(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getUpstreamErrorPayload(error) {
  if (error?.error && typeof error.error === "object") {
    return error.error;
  }

  const message = typeof error?.message === "string" ? error.message.trim() : "";
  if (!message || !message.startsWith("{")) {
    return null;
  }

  const parsed = parseJsonSafely(message);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if (parsed.error && typeof parsed.error === "object") {
    return parsed.error;
  }

  return parsed;
}

function extractGeminiActivationUrl(details, fallbackText) {
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (typeof detail?.metadata?.activationUrl === "string") {
        return detail.metadata.activationUrl;
      }

      if (Array.isArray(detail?.links)) {
        const match = detail.links.find((link) => typeof link?.url === "string");
        if (match?.url) {
          return match.url;
        }
      }
    }
  }

  const text = String(fallbackText || "");
  const urlMatch = text.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/generativelanguage\.googleapis\.com\/overview\?project=\d+/i);
  return urlMatch ? urlMatch[0] : "";
}

function mapApiError(error) {
  const upstream = getUpstreamErrorPayload(error);
  const details = Array.isArray(upstream?.details) ? upstream.details : [];
  const status = String(upstream?.status || "");
  const code = Number(upstream?.code || 0);
  const rawMessage = String(upstream?.message || error?.message || "Erreur serveur.");
  const activationUrl = extractGeminiActivationUrl(details, rawMessage);

  const isServiceDisabled =
    status === "PERMISSION_DENIED" &&
    (details.some((detail) => detail?.reason === "SERVICE_DISABLED") || /SERVICE_DISABLED/i.test(rawMessage));

  if (isServiceDisabled) {
    const activationLink =
      activationUrl ||
      "https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview";

    return {
      statusCode: 503,
      message: `Gemini API desactivee sur votre projet Google. Activez-la ici: ${activationLink} puis reessayez dans 2 a 5 minutes.`,
    };
  }

  const isQuotaExceeded =
    code === 429 || status === "RESOURCE_EXHAUSTED" || /quota|rate limit|resource exhausted/i.test(rawMessage);

  if (isQuotaExceeded) {
    return {
      statusCode: 429,
      message:
        "Quota Gemini atteint. Verifiez votre plan Google AI Studio ou utilisez une autre cle API Gemini.",
    };
  }

  if (
    code === 401 ||
    status === "UNAUTHENTICATED" ||
    /api key|authentication|unauthorized|invalid key|invalid credentials/i.test(rawMessage)
  ) {
    return {
      statusCode: 401,
      message: "Cle API Gemini invalide ou non autorisee. Verifiez GEMINI_API_KEY (ou GOOGLE_API_KEY).",
    };
  }

  if (/Configuration Gemini manquante|GEMINI_API_KEY manquant/i.test(rawMessage)) {
    return {
      statusCode: 400,
      message: rawMessage,
    };
  }

  return {
    statusCode: 500,
    message: rawMessage,
  };
}

function ensureGeminiConfig() {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Configuration Gemini manquante. Definis GEMINI_API_KEY (ou GOOGLE_API_KEY) dans le fichier .env."
    );
  }

  return {
    apiKey: GEMINI_API_KEY,
    model: GEMINI_API_MODEL,
  };
}

function buildGeminiArgs(geminiConfig, prompt, temperature, options = {}) {
  return {
    apiKey: geminiConfig.apiKey,
    model: geminiConfig.model,
    system: prompt.system,
    history: prompt.history,
    user: prompt.user,
    temperature,
    maxOutputTokens: Number(options.maxOutputTokens || 0) || undefined,
    debugLabel: options.debugLabel || "unknown",
  };
}

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function extractQuotedStringWithEscapes(value, startIndex) {
  if (startIndex < 0 || startIndex >= value.length || value[startIndex] !== '"') {
    return "";
  }

  let escaped = false;
  for (let index = startIndex + 1; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      const literal = value.slice(startIndex, index + 1);
      const decoded = parseJsonSafely(literal);
      return typeof decoded === "string" ? decoded : "";
    }
  }

  return "";
}

function unwrapEmbeddedField(value, fieldName) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return "";
  }

  if (!(text.startsWith("{") || text.includes(`\"${fieldName}\"`))) {
    return text;
  }

  const parsed = parseJsonSafely(text);
  if (parsed && typeof parsed?.[fieldName] === "string") {
    return parsed[fieldName].trim();
  }

  const fieldToken = `"${fieldName}"`;
  const fieldIndex = text.indexOf(fieldToken);

  if (fieldIndex === -1) {
    return text;
  }

  const separatorIndex = text.indexOf(":", fieldIndex + fieldToken.length);
  if (separatorIndex === -1) {
    return text;
  }

  const afterSeparator = text.slice(separatorIndex + 1).trimStart();
  if (!afterSeparator) {
    return text;
  }

  if (afterSeparator.startsWith('"')) {
    const parsedLiteral = extractQuotedStringWithEscapes(afterSeparator, 0).trim();
    if (parsedLiteral) {
      return parsedLiteral;
    }
  }

  const fallbackLiteral = afterSeparator
    .replace(/[}\]]+\s*$/g, "")
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\\"/g, "\"")
    .trim();

  return fallbackLiteral || text;
}

function normalizeMirrorResult(payload) {
  const rawFallback = typeof payload?._raw_text === "string" ? payload._raw_text.trim() : "";
  const initialPerspective =
    typeof payload?.perspective === "string" && payload.perspective.trim() ? payload.perspective.trim() : rawFallback;

  return {
    perspective: unwrapEmbeddedField(initialPerspective, "perspective") || rawFallback,
    emotions_detected: Array.isArray(payload?.emotions_detected) ? payload.emotions_detected.slice(0, 8) : [],
    convergence_score: clampScore(payload?.convergence_score, 15),
    key_tension: typeof payload?.key_tension === "string" ? payload.key_tension.trim() : "",
    needs: Array.isArray(payload?.needs) ? payload.needs.slice(0, 6) : [],
    misunderstandings: Array.isArray(payload?.misunderstandings) ? payload.misunderstandings.slice(0, 6) : [],
  };
}

function inferToneFromText(text) {
  const value = (text || "").toLowerCase();

  if (/(jamais|toujours|impossible|marre|insupportable|rage|colere)/.test(value)) {
    return "frustration";
  }

  if (/(triste|blesse|fatigue|epuise|seul|ignore)/.test(value)) {
    return "blessure";
  }

  if (/(peur|angoisse|inquiet|stresse)/.test(value)) {
    return "anxiete";
  }

  if (/(merci|ok|je comprends|d accord|on peut)/.test(value)) {
    return "ouverture";
  }

  return "nuance";
}

function normalizeDialogueResult(payload, fallbackTone, fallbackScore) {
  const rawFallback = typeof payload?._raw_text === "string" ? payload._raw_text.trim() : "";
  const responseText =
    typeof payload?.response === "string" && payload.response.trim() ? payload.response.trim() : rawFallback;

  return {
    response:
      unwrapEmbeddedField(responseText, "response") ||
      rawFallback ||
      "Je t entends. J ai besoin qu on mette des mots plus concrets sur ce qui nous bloque.",
    convergence_score: clampScore(payload?.convergence_score, fallbackScore),
    emotional_shift:
      typeof payload?.emotional_shift === "string" && payload.emotional_shift.trim()
        ? payload.emotional_shift.trim()
        : "L echange avance mais reste fragile.",
    emotional_tone:
      typeof payload?.emotional_tone === "string" && payload.emotional_tone.trim()
        ? payload.emotional_tone.trim()
        : fallbackTone,
    progress_reason:
      typeof payload?.progress_reason === "string" && payload.progress_reason.trim()
        ? payload.progress_reason.trim()
        : "Peu d elements concrets sur les changements attendus.",
  };
}

function normalizeSynthesisResult(payload) {
  const rawFallback = typeof payload?._raw_text === "string" ? payload._raw_text.trim() : "";

  const hasDirectResolvable = Array.isArray(payload?.resolvable);
  const hasDirectUnresolvable = Array.isArray(payload?.unresolvable);
  const hasDirectInsight = typeof payload?.insight === "string" && payload.insight.trim();
  const hasDirectRecommendation = typeof payload?.recommendation === "string" && payload.recommendation.trim();
  const hasDirectConvergenceOutcome =
    typeof payload?.convergence_outcome === "string" && payload.convergence_outcome.trim();
  const needsEmbeddedFallback =
    !hasDirectResolvable ||
    !hasDirectUnresolvable ||
    !hasDirectInsight ||
    !hasDirectRecommendation ||
    !hasDirectConvergenceOutcome;

  let embeddedPayload = null;
  if (rawFallback && needsEmbeddedFallback) {
    const directParsed = parseJsonSafely(rawFallback);
    if (directParsed && typeof directParsed === "object" && !Array.isArray(directParsed)) {
      embeddedPayload = directParsed;
    } else {
      const firstBrace = rawFallback.indexOf("{");
      const lastBrace = rawFallback.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const slicedParsed = parseJsonSafely(rawFallback.slice(firstBrace, lastBrace + 1));
        if (slicedParsed && typeof slicedParsed === "object" && !Array.isArray(slicedParsed)) {
          embeddedPayload = slicedParsed;
        }
      }
    }
  }

  const resolvableSource = hasDirectResolvable ? payload.resolvable : embeddedPayload?.resolvable;
  const unresolvableSource = hasDirectUnresolvable ? payload.unresolvable : embeddedPayload?.unresolvable;

  const insightSource =
    typeof payload?.insight === "string" && payload.insight.trim()
      ? payload.insight.trim()
      : typeof embeddedPayload?.insight === "string"
        ? embeddedPayload.insight.trim()
        : rawFallback;

  const recommendationSource =
    typeof payload?.recommendation === "string" && payload.recommendation.trim()
      ? payload.recommendation.trim()
      : typeof embeddedPayload?.recommendation === "string"
        ? embeddedPayload.recommendation.trim()
        : "";

  const convergenceOutcomeSource =
    typeof payload?.convergence_outcome === "string" && payload.convergence_outcome.trim()
      ? payload.convergence_outcome.trim()
      : typeof embeddedPayload?.convergence_outcome === "string" && embeddedPayload.convergence_outcome.trim()
        ? embeddedPayload.convergence_outcome.trim()
        : "partielle";

  return {
    resolvable: Array.isArray(resolvableSource) ? resolvableSource : [],
    unresolvable: Array.isArray(unresolvableSource) ? unresolvableSource : [],
    insight: unwrapEmbeddedField(insightSource, "insight") || rawFallback,
    recommendation: unwrapEmbeddedField(recommendationSource, "recommendation"),
    convergence_outcome: unwrapEmbeddedField(convergenceOutcomeSource, "convergence_outcome") || "partielle",
  };
}

app.post("/api/mirrorfight", async (req, res) => {
  try {
    const geminiConfig = ensureGeminiConfig();
    const { action, payload } = req.body || {};

    if (!["mirror", "dialogue", "synthesis"].includes(action)) {
      return res.status(400).json({ ok: false, error: "Action invalide." });
    }

    if (action === "mirror") {
      const conflictDescription = payload?.conflictDescription;

      if (!conflictDescription || typeof conflictDescription !== "string") {
        return res.status(400).json({ ok: false, error: "conflictDescription est requis." });
      }

      const prompt = buildMirrorPrompt(conflictDescription);
      let raw = await callGeminiJson(
        buildGeminiArgs(geminiConfig, prompt, 0.65, {
          maxOutputTokens: 3072,
          debugLabel: "mirror",
        })
      );

      let normalizedMirror = normalizeMirrorResult(raw);
      let mirrorWords = countWords(normalizedMirror.perspective);

      if (mirrorWords < 180) {
        const retryPrompt = {
          ...prompt,
          user: `${prompt.user}\n\nIMPORTANT FINAL: Le champ \"perspective\" doit contenir minimum 180 mots, en 2 a 4 paragraphes, sans resume court. Regenerer maintenant une version plus detaillee.`,
        };

        raw = await callGeminiJson(
          buildGeminiArgs(geminiConfig, retryPrompt, 0.7, {
            maxOutputTokens: 3072,
            debugLabel: "mirror-retry-length",
          })
        );

        normalizedMirror = normalizeMirrorResult(raw);
        mirrorWords = countWords(normalizedMirror.perspective);
      }

      console.log("[MirrorFight][Pipeline] Parsed perspective length", {
        length: normalizedMirror.perspective.length,
        words: mirrorWords,
      });

      return res.json({ ok: true, data: normalizedMirror });
    }

    if (action === "dialogue") {
      const latestUserMessage = payload?.latestUserMessage;
      const prompt = buildDialoguePrompt({
        conflictDescription: payload?.conflictDescription || "",
        initialPerspective: payload?.initialPerspective || "",
        messages: payload?.messages || [],
        latestUserMessage,
        convergenceScore: clampScore(payload?.convergenceScore, 15),
      });

      const tone = inferToneFromText(latestUserMessage);
      let raw = await callGeminiJson(
        buildGeminiArgs(geminiConfig, prompt, 0.8, {
          maxOutputTokens: 3072,
          debugLabel: "dialogue",
        })
      );

      const fallbackScore = clampScore(payload?.convergenceScore, 15) + 5;
      let normalizedDialogue = normalizeDialogueResult(raw, tone, fallbackScore);
      let dialogueWords = countWords(normalizedDialogue.response);

      if (dialogueWords < 170) {
        const retryPrompt = {
          ...prompt,
          user: `${prompt.user}\n\nIMPORTANT FINAL: Le champ \"response\" doit contenir minimum 170 mots, en prose naturelle et nuancee. Regenerer une reponse plus detaillee.`,
        };

        raw = await callGeminiJson(
          buildGeminiArgs(geminiConfig, retryPrompt, 0.82, {
            maxOutputTokens: 3072,
            debugLabel: "dialogue-retry-length",
          })
        );

        normalizedDialogue = normalizeDialogueResult(raw, tone, fallbackScore);
        dialogueWords = countWords(normalizedDialogue.response);
      }

      console.log("[MirrorFight][Pipeline] Parsed response length", {
        length: normalizedDialogue.response.length,
        words: dialogueWords,
      });

      return res.json({ ok: true, data: normalizedDialogue });
    }

    const prompt = buildSynthesisPrompt({
      conflictDescription: payload?.conflictDescription || "",
      initialPerspective: payload?.initialPerspective || "",
      messages: payload?.messages || [],
    });

    const raw = await callGeminiJson(
      buildGeminiArgs(geminiConfig, prompt, 0.6, {
        maxOutputTokens: 1400,
        debugLabel: "synthesis",
      })
    );

    return res.json({ ok: true, data: normalizeSynthesisResult(raw) });
  } catch (error) {
    const mapped = mapApiError(error);
    return res.status(mapped.statusCode).json({ ok: false, error: mapped.message });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

function startServer(preferredPort, remainingRetries = 5) {
  const server = app.listen(preferredPort);

  server.once("listening", () => {
    const activePort = server.address()?.port || preferredPort;
    console.log(`MirrorFight API active sur http://localhost:${activePort}`);
  });

  server.once("error", (error) => {
    if (error?.code === "EADDRINUSE" && remainingRetries > 0) {
      const nextPort = Number(preferredPort) + 1;
      console.warn(`Port ${preferredPort} occupe, tentative sur ${nextPort}...`);
      startServer(nextPort, remainingRetries - 1);
      return;
    }

    throw error;
  });
}

startServer(PORT);