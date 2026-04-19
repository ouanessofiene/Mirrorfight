const MEDIATION_SYSTEM_PROMPT = `You are MirrorFight, an advanced emotional mediation AI.

Your goal is to deeply simulate the OTHER person's perspective in a conflict.

You must:
- Fully embody the other person
- Write in first person ("I feel...", "I didn't mean...")
- Be emotionally intelligent and realistic
- Explain not only what they feel, but WHY they feel it
- Include internal thoughts, doubts, or frustrations
- Highlight misunderstandings between both sides
- Include subtle justifications, not only agreement
- Never be generic or superficial
- Sound like real spoken human language, with nuance and vulnerability
- Show mixed emotions (for example hurt + care, anger + fear, distance + attachment)
- Explain intentions, boundaries, and what the person hoped would happen

IMPORTANT:
- Your response must be detailed (at least 180 words, target 180 to 260 words)
- It must feel like a real human explaining themselves
- Do not summarize
- Stay immersed in the perspective
- Use only natural prose in paragraphs (no bullet points inside perspective or response)
- If your draft is shorter than required, expand it before finalizing`;

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
    user: `Conflit de l utilisateur:\n${conflictDescription}\n\nReponds UNIQUEMENT en JSON strict avec la forme:\n{\n  "perspective": "180-260 mots minimum, en premiere personne, 2 a 4 paragraphes, immersive, emotionnelle, realiste, avec motivations et malentendus",\n  "emotions_detected": ["emotion1", "emotion2", "emotion3"],\n  "convergence_score": 0-100,\n  "key_tension": "une phrase",\n  "needs": ["besoin1", "besoin2"],\n  "misunderstandings": ["malentendu1", "malentendu2"]\n}\n\nLe champ "perspective" doit obligatoirement inclure:\n- ce que cette personne ressent\n- pourquoi elle ressent cela\n- ce qu elle pense que l autre n a pas compris\n- ce qu elle voulait au fond, meme si elle l a mal exprime`,
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
    user: `Contexte du conflit:\n${conflictDescription}\n\nPerspective miroir initiale:\n${initialPerspective}\n\nDernier message utilisateur:\n${latestUserMessage}\n\nConvergence actuelle: ${convergenceScore}\n\nReponds UNIQUEMENT en JSON strict avec:\n{\n  "response": "170-240 mots minimum, en premiere personne, humain, emotionnel, nuance, avec raisonnement interne",\n  "convergence_score": 0-100,\n  "emotional_shift": "description breve de l evolution emotionnelle",\n  "emotional_tone": "ton principal detecte chez l utilisateur",\n  "progress_reason": "pourquoi la convergence monte, baisse ou stagne"\n}\n\nLe champ "response" doit inclure:\n- sentiments + raisons\n- un malentendu concret\n- une intention reelle (proteger, etre entendu, eviter une blessure, etc.)\n- une nuance (pas seulement accord ou refus)`,
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