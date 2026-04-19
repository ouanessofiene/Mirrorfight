import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { buildDialoguePrompt, buildMirrorPrompt, buildSynthesisPrompt } from "./prompts.js";
import { callGeminiJson, clampScore } from "./llmClient.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.SERVER_PORT || 8787);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
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

  if (
    code === 401 ||
    status === "UNAUTHENTICATED" ||
    /api key|authentication|unauthorized|invalid key/i.test(rawMessage)
  ) {
    return {
      statusCode: 401,
      message: "Cle API Gemini invalide ou non autorisee. Verifiez GEMINI_API_KEY et les restrictions de la cle.",
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
    throw new Error("Configuration Gemini manquante. Definis GEMINI_API_KEY dans le fichier .env.");
  }

  return {
    apiKey: GEMINI_API_KEY,
    model: GEMINI_API_MODEL,
  };
}

function buildGeminiArgs(geminiConfig, prompt, temperature) {
  return {
    apiKey: geminiConfig.apiKey,
    model: geminiConfig.model,
    system: prompt.system,
    history: prompt.history,
    user: prompt.user,
    temperature,
  };
}

function normalizeMirrorResult(payload) {
  return {
    perspective: typeof payload?.perspective === "string" ? payload.perspective.trim() : "",
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
  return {
    response:
      typeof payload?.response === "string" && payload.response.trim()
        ? payload.response.trim()
        : "Je t entends. J ai besoin qu on mette des mots plus concrets sur ce qui nous bloque.",
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
  return {
    resolvable: Array.isArray(payload?.resolvable) ? payload.resolvable : [],
    unresolvable: Array.isArray(payload?.unresolvable) ? payload.unresolvable : [],
    insight: typeof payload?.insight === "string" ? payload.insight : "",
    recommendation: typeof payload?.recommendation === "string" ? payload.recommendation : "",
    convergence_outcome:
      typeof payload?.convergence_outcome === "string" ? payload.convergence_outcome : "partielle",
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
      const raw = await callGeminiJson(buildGeminiArgs(geminiConfig, prompt, 0.65));

      return res.json({ ok: true, data: normalizeMirrorResult(raw) });
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
      const raw = await callGeminiJson(buildGeminiArgs(geminiConfig, prompt, 0.8));

      const fallbackScore = clampScore(payload?.convergenceScore, 15) + 5;
      return res.json({ ok: true, data: normalizeDialogueResult(raw, tone, fallbackScore) });
    }

    const prompt = buildSynthesisPrompt({
      conflictDescription: payload?.conflictDescription || "",
      initialPerspective: payload?.initialPerspective || "",
      messages: payload?.messages || [],
    });

    const raw = await callGeminiJson(buildGeminiArgs(geminiConfig, prompt, 0.6));

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