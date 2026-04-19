const MEDIATION_SYSTEM_PROMPT =
  "Tu es un agent de mediation emotionnelle. Tu aides un utilisateur a voir un conflit depuis la perspective de l autre personne. Tu dois reformuler avec empathie, profondeur emotionnelle, neutralite, realisme et intelligence relationnelle. Tu ne prends pas parti. Tu identifies les emotions, besoins, frustrations, attentes, malentendus et points de rupture. Tu aides a faire emerger soit une convergence, soit une comprehension claire de l impasse.";

function safeList(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.text === "string")
    .map((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: message.text,
    }));
}

export function buildMirrorPrompt(conflictDescription) {
  return {
    system: MEDIATION_SYSTEM_PROMPT,
    user: `Conflit de l utilisateur:\n${conflictDescription}\n\nReponds UNIQUEMENT en JSON strict avec la forme:\n{\n  "perspective": "2-3 paragraphes du point de vue de l autre personne",\n  "emotions_detected": ["emotion1", "emotion2", "emotion3"],\n  "convergence_score": 0-100,\n  "key_tension": "une phrase",\n  "needs": ["besoin1", "besoin2"],\n  "misunderstandings": ["malentendu1", "malentendu2"]\n}`,
    history: [],
  };
}

export function buildDialoguePrompt({
  conflictDescription,
  initialPerspective,
  messages,
  latestUserMessage,
  convergenceScore,
}) {
  return {
    system: `${MEDIATION_SYSTEM_PROMPT}\nTu incarnes l autre personne de maniere realiste. N ecris pas une reponse generique. Prends en compte l historique et reponds de facon credibile, emotionnelle mais constructive.`,
    history: safeList(messages),
    user: `Contexte du conflit:\n${conflictDescription}\n\nPerspective miroir initiale:\n${initialPerspective}\n\nDernier message utilisateur:\n${latestUserMessage}\n\nConvergence actuelle: ${convergenceScore}\n\nReponds UNIQUEMENT en JSON strict avec:\n{\n  "response": "1-2 paragraphes de reponse",\n  "convergence_score": 0-100,\n  "emotional_shift": "description breve de l evolution emotionnelle",\n  "emotional_tone": "ton principal detecte chez l utilisateur",\n  "progress_reason": "pourquoi la convergence monte, baisse ou stagne"\n}`,
  };
}

export function buildSynthesisPrompt({ conflictDescription, initialPerspective, messages }) {
  const transcript = safeList(messages)
    .map((item) => `${item.role === "user" ? "Utilisateur" : "Autre"}: ${item.content}`)
    .join("\n");

  return {
    system: `${MEDIATION_SYSTEM_PROMPT}\nTu dois produire une synthese fidele au contenu reel de l echange. Pas de generalites.`,
    history: [],
    user: `Conflit initial:\n${conflictDescription}\n\nPerspective miroir initiale:\n${initialPerspective}\n\nTranscript complet:\n${transcript}\n\nReponds UNIQUEMENT en JSON strict avec:\n{\n  "resolvable": ["point 1", "point 2"],\n  "unresolvable": ["point 1", "point 2"],\n  "insight": "2-3 phrases tres concretes",\n  "recommendation": "1-2 phrases actionnables",\n  "convergence_outcome": "convergence|impasse|partielle"\n}`,
  };
}