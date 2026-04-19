# MirrorFight

Application MVP de mediation relationnelle avec integration IA reelle via Gemini API key.

L utilisateur decrit un conflit, puis l application:

1. analyse le conflit,
2. genere la perspective de l autre personne,
3. maintient un dialogue contextuel,
4. produit une synthese finale basee sur le contenu reel de l echange.

## Stack

- Frontend: React 18 + Vite + CSS global
- Backend: Node.js + Express
- LLM: Gemini via API key (Google AI Studio)
- State management frontend: useState + useReducer

Modele recommande pour MVP (cout/latence): gemini-2.5-flash

## Architecture finale

- Le frontend appelle une API interne: POST /api/mirrorfight
- Le backend orchestre prompts + historique et appelle Gemini (API key)
- La cle/les credentials ne sont jamais exposes dans le frontend
- Le backend gere 3 actions:
1. mirror
2. dialogue
3. synthesis

## API backend

Route unique:

- POST /api/mirrorfight

Body:

```json
{
	"action": "mirror | dialogue | synthesis",
	"payload": {}
}
```

## Variables d environnement

Copier .env.example vers .env puis renseigner:

```bash
GEMINI_API_KEY=ta-cle-gemini
GEMINI_API_MODEL=gemini-2.5-flash
SERVER_PORT=8787
```

Notes:

- Le backend fonctionne uniquement avec GEMINI_API_KEY.
- La cle reste cote backend, jamais exposee au frontend.

Option frontend:

- VITE_API_BASE_URL (utile si frontend et backend sont deployes sur des domaines differents)

## NPM packages

Dependances principales:

- @google/genai
- express
- dotenv
- react
- react-dom
- vite

## Lancer le projet

1. Installer les dependances:

```bash
npm install
```

2. Creer le .env:

```bash
cp .env.example .env
```

3. Renseigner GEMINI_API_KEY dans le fichier .env.

4. Lancer frontend + backend en dev:

```bash
npm run dev
```

5. Build frontend:

```bash
npm run build
```

6. Run serveur (mode production):

```bash
npm run start
```

## Fichiers modifies pour Gemini

- server/index.js
- server/llmClient.js
- server/prompts.js
- package.json
- .env.example
- README.md

## Structure

```text
server/
├── index.js
├── llmClient.js
└── prompts.js

src/
├── App.jsx
├── components/
│   ├── IntroScreen.jsx
│   ├── ConflictInput.jsx
│   ├── MirrorView.jsx
│   ├── DialogueMode.jsx
│   ├── ConvergenceMeter.jsx
│   ├── Synthesis.jsx
│   └── MessageBubble.jsx
├── utils/
│   └── mirrorfightApi.js
├── styles/
│   └── global.css
└── data/
		└── mockScenarios.js
```