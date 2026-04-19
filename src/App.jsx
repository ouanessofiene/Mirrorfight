import { useMemo, useReducer, useState } from "react";
import ConflictInput from "./components/ConflictInput.jsx";
import DialogueMode from "./components/DialogueMode.jsx";
import IntroScreen from "./components/IntroScreen.jsx";
import MirrorView from "./components/MirrorView.jsx";
import Synthesis from "./components/Synthesis.jsx";
import { demoConflictExample } from "./data/mockScenarios.js";
import { callMirrorfightApi, clampScore } from "./utils/mirrorfightApi.js";

const STEP_ORDER = ["intro", "input", "mirror", "dialogue", "synthesis"];

const STEP_LABELS = {
  intro: "Accueil",
  input: "Conflit",
  mirror: "Miroir",
  dialogue: "Dialogue",
  synthesis: "Synthese",
};

const INITIAL_CONVERGENCE = 15;

const EMPTY_MIRROR = {
  perspective: "",
  emotions_detected: [],
  convergence_score: INITIAL_CONVERGENCE,
  key_tension: "",
  needs: [],
  misunderstandings: [],
};

const EMPTY_SYNTHESIS = {
  resolvable: [],
  unresolvable: [],
  insight: "",
  recommendation: "",
  convergence_outcome: "partielle",
};

const INITIAL_DIALOGUE_STATE = {
  messages: [],
};

function dialogueReducer(state, action) {
  switch (action.type) {
    case "reset":
      return INITIAL_DIALOGUE_STATE;
    case "set_messages":
      return { ...state, messages: action.payload };
    case "add_message":
      return { ...state, messages: [...state.messages, action.payload] };
    default:
      return state;
  }
}

function createMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
  };
}

function normalizeMirrorResult(payload) {
  return {
    perspective: typeof payload?.perspective === "string" ? payload.perspective.trim() : "",
    emotions_detected: Array.isArray(payload?.emotions_detected) ? payload.emotions_detected.slice(0, 6) : [],
    convergence_score: clampScore(payload?.convergence_score, INITIAL_CONVERGENCE),
    key_tension: typeof payload?.key_tension === "string" ? payload.key_tension.trim() : "",
    needs: Array.isArray(payload?.needs) ? payload.needs.slice(0, 6) : [],
    misunderstandings: Array.isArray(payload?.misunderstandings) ? payload.misunderstandings.slice(0, 6) : [],
  };
}

function normalizeDialogueResult(payload, fallbackScore) {
  return {
    response:
      typeof payload?.response === "string" && payload.response.trim().length > 0
        ? payload.response.trim()
        : "Je t entends, mais j ai besoin de concret pour avancer.",
    convergence_score: clampScore(payload?.convergence_score, fallbackScore),
    emotional_shift:
      typeof payload?.emotional_shift === "string" && payload.emotional_shift.trim().length > 0
        ? payload.emotional_shift.trim()
        : "Convergence lente mais possible.",
    emotional_tone:
      typeof payload?.emotional_tone === "string" && payload.emotional_tone.trim().length > 0
        ? payload.emotional_tone.trim()
        : "nuance",
    progress_reason:
      typeof payload?.progress_reason === "string" && payload.progress_reason.trim().length > 0
        ? payload.progress_reason.trim()
        : "Progression moderee.",
  };
}

function normalizeSynthesis(payload) {
  return {
    resolvable: Array.isArray(payload?.resolvable) ? payload.resolvable : [],
    unresolvable: Array.isArray(payload?.unresolvable) ? payload.unresolvable : [],
    insight: typeof payload?.insight === "string" ? payload.insight : "",
    recommendation: typeof payload?.recommendation === "string" ? payload.recommendation : "",
    convergence_outcome:
      typeof payload?.convergence_outcome === "string" ? payload.convergence_outcome : "partielle",
  };
}

function App() {
  const [currentStep, setCurrentStep] = useState("intro");
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);
  const [conflictDescription, setConflictDescription] = useState("");
  const [mirrorResult, setMirrorResult] = useState(EMPTY_MIRROR);
  const [convergenceScore, setConvergenceScore] = useState(INITIAL_CONVERGENCE);
  const [dialogueDraft, setDialogueDraft] = useState("");
  const [dialogueState, dispatchDialogue] = useReducer(dialogueReducer, INITIAL_DIALOGUE_STATE);
  const [synthesis, setSynthesis] = useState(EMPTY_SYNTHESIS);
  const [loadingAction, setLoadingAction] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentStepIndex = useMemo(() => STEP_ORDER.indexOf(currentStep), [currentStep]);

  const isLoadingMirror = loadingAction === "mirror";
  const isLoadingDialogue = loadingAction === "dialogue" || loadingAction === "synthesis";

  const goToStep = (step, options = {}) => {
    const stepIndex = STEP_ORDER.indexOf(step);

    if (stepIndex === -1) {
      return;
    }

    if (!options.force && stepIndex > maxUnlockedStep) {
      return;
    }

    setCurrentStep(step);
    setMaxUnlockedStep((prev) => Math.max(prev, stepIndex));
  };

  const resetFlow = () => {
    setCurrentStep("intro");
    setMaxUnlockedStep(0);
    setConflictDescription("");
    setMirrorResult(EMPTY_MIRROR);
    setConvergenceScore(INITIAL_CONVERGENCE);
    setDialogueDraft("");
    dispatchDialogue({ type: "reset" });
    setSynthesis(EMPTY_SYNTHESIS);
    setLoadingAction("");
    setStatusNotice("");
    setErrorMessage("");
  };

  const handleUseExample = () => {
    setConflictDescription(demoConflictExample.conflictDescription);
    setStatusNotice("Exemple charge. Tu peux le modifier avant de continuer.");
    setErrorMessage("");
  };

  const handleGenerateMirror = async () => {
    const trimmedDescription = conflictDescription.trim();

    if (!trimmedDescription) {
      setErrorMessage("Decris le conflit avant de generer le miroir.");
      return;
    }

    setLoadingAction("mirror");
    setErrorMessage("");
    setStatusNotice("");
    dispatchDialogue({ type: "reset" });
    setSynthesis(EMPTY_SYNTHESIS);

    try {
      const data = await callMirrorfightApi("mirror", {
        conflictDescription: trimmedDescription,
      });
      const normalized = normalizeMirrorResult(data);

      if (!normalized.perspective) {
        throw new Error("La reponse IA miroir est vide.");
      }

      setMirrorResult(normalized);
      setConvergenceScore(normalized.convergence_score);
      setStatusNotice("Perspective adverse generee par l IA.");
      goToStep("mirror", { force: true });
    } catch (error) {
      setErrorMessage(error.message || "Impossible de generer la perspective adverse.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleSendDialogueMessage = async () => {
    const trimmedDraft = dialogueDraft.trim();

    if (!trimmedDraft || loadingAction) {
      return;
    }

    const userMessage = createMessage("user", trimmedDraft);
    const historyWithNewMessage = [...dialogueState.messages, userMessage];

    dispatchDialogue({ type: "add_message", payload: userMessage });
    setDialogueDraft("");
    setLoadingAction("dialogue");
    setErrorMessage("");
    setStatusNotice("");

    try {
      const data = await callMirrorfightApi("dialogue", {
        conflictDescription,
        initialPerspective: mirrorResult.perspective,
        messages: historyWithNewMessage,
        latestUserMessage: trimmedDraft,
        convergenceScore,
      });
      const normalized = normalizeDialogueResult(data, convergenceScore + 8);

      dispatchDialogue({ type: "add_message", payload: createMessage("other", normalized.response) });
      setConvergenceScore(normalized.convergence_score);
      setStatusNotice(
        `Ton detecte: ${normalized.emotional_tone}. ${normalized.emotional_shift} (${normalized.progress_reason})`
      );
    } catch (error) {
      setErrorMessage(error.message || "Impossible de continuer le dialogue pour le moment.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleGenerateSynthesis = async () => {
    if (!dialogueState.messages.length) {
      setErrorMessage("Ajoute au moins un echange avant la synthese.");
      return;
    }

    setLoadingAction("synthesis");
    setErrorMessage("");
    setStatusNotice("");

    try {
      const data = await callMirrorfightApi("synthesis", {
        conflictDescription,
        initialPerspective: mirrorResult.perspective,
        messages: dialogueState.messages,
      });

      const normalized = normalizeSynthesis(data);
      setSynthesis(normalized);
      setStatusNotice(`Synthese generee (${normalized.convergence_outcome}).`);
      goToStep("synthesis", { force: true });
    } catch (error) {
      setErrorMessage(error.message || "Impossible de generer la synthese finale.");
    } finally {
      setLoadingAction("");
    }
  };

  const stepView = {
    intro: <IntroScreen onStart={() => goToStep("input", { force: true })} />,
    input: (
      <ConflictInput
        conflictDescription={conflictDescription}
        onConflictChange={setConflictDescription}
        onGenerateMirror={handleGenerateMirror}
        onUseExample={handleUseExample}
        isLoading={isLoadingMirror}
      />
    ),
    mirror: (
      <MirrorView
        mirrorData={mirrorResult}
        onBack={() => goToStep("input")}
        onContinue={() => goToStep("dialogue", { force: true })}
      />
    ),
    dialogue: (
      <DialogueMode
        messages={dialogueState.messages}
        draft={dialogueDraft}
        onDraftChange={setDialogueDraft}
        onSend={handleSendDialogueMessage}
        onBack={() => goToStep("mirror")}
        onGenerateSynthesis={handleGenerateSynthesis}
        convergenceScore={convergenceScore}
        isLoading={isLoadingDialogue}
      />
    ),
    synthesis: <Synthesis synthesis={synthesis} onBack={() => goToStep("dialogue")} onRestart={resetFlow} />,
  };

  return (
    <div className="app-shell">
      <div className="bg-orb orb-main" aria-hidden="true" />
      <div className="bg-orb orb-accent" aria-hidden="true" />

      <header className="topbar">
        <div>
          <p className="eyebrow">MirrorFight</p>
          <h1>Conflict mirror prototype</h1>
        </div>
        <button className="btn btn-secondary" onClick={resetFlow}>
          Reinitialiser
        </button>
      </header>

      {(statusNotice || errorMessage) && (
        <div className="status-stack">
          {statusNotice && <p className="status-banner status-banner-info">{statusNotice}</p>}
          {errorMessage && <p className="status-banner status-banner-error">{errorMessage}</p>}
        </div>
      )}

      <nav className="stepper" aria-label="Navigation entre etapes">
        {STEP_ORDER.map((step, index) => {
          const isActive = currentStep === step;
          const isUnlocked = index <= maxUnlockedStep;

          return (
            <button
              key={step}
              className={`step-pill ${isActive ? "step-pill-active" : ""}`}
              onClick={() => goToStep(step)}
              disabled={!isUnlocked}
            >
              <span className="step-index">{index + 1}</span>
              <span>{STEP_LABELS[step]}</span>
            </button>
          );
        })}
      </nav>

      <main key={`${currentStep}-${currentStepIndex}`} className="panel slide-in">
        {stepView[currentStep]}
      </main>
    </div>
  );
}

export default App;