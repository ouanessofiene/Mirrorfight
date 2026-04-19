# MirrorFight

Application de mediation relationnelle avec integration IA reelle via Gemini Developer API.

L utilisateur decrit un conflit, puis l application:

1. analyse le conflit,
2. genere la perspective de l autre personne,
3. maintient un dialogue contextuel,
4. produit une synthese finale basee sur le contenu reel de l echange.

## Stack

- Frontend: React 18 + Vite + CSS global
- Backend: Node.js + Express
- LLM: Gemini via @google/genai
- Auth: Cle API Gemini (GEMINI_API_KEY)

Modele recommande pour MVP (cout/latence): gemini-2.5-flash

## Architecture

- Le frontend appelle POST /api/mirrorfight
- Le backend orchestre prompts + historique et appelle Gemini API
- Le backend gere 3 actions: mirror, dialogue, synthesis
- Aucun secret n est expose dans le frontend

## Variables d environnement

Copier .env.example vers .env puis renseigner:

```bash
GEMINI_API_KEY=ta_cle_api_gemini
GEMINI_API_MODEL=gemini-2.5-flash
SERVER_PORT=8787
```

Variable alternative supportee:

- GOOGLE_API_KEY

## Setup Gemini API

1. Ouvrir Google AI Studio et generer une cle API.
2. Activer l API Generative Language si necessaire:

```bash
https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview
```

3. Mettre la cle dans .env:

```bash
GEMINI_API_KEY=ta_cle_api_gemini
```

4. Lancer le projet:

```bash
npm install
cp .env.example .env
npm run dev
```

## Lancer le projet

```bash
npm install
cp .env.example .env
npm run dev
```

## Build

```bash
npm run build
```