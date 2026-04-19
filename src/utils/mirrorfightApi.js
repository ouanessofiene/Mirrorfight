const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildApiUrl(pathname) {
  if (!API_BASE_URL) {
    return pathname;
  }

  return `${API_BASE_URL.replace(/\/$/, "")}${pathname}`;
}

export function clampScore(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export async function callMirrorfightApi(action, payload) {
  const response = await fetch(buildApiUrl("/api/mirrorfight"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, payload }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || "Erreur API MirrorFight.");
  }

  return body.data;
}