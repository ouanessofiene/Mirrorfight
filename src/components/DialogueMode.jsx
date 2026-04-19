import { useEffect, useRef } from "react";
import ConvergenceMeter from "./ConvergenceMeter.jsx";
import MessageBubble from "./MessageBubble.jsx";

function DialogueMode({
  messages,
  draft,
  onDraftChange,
  onSend,
  onBack,
  onGenerateSynthesis,
  convergenceScore,
  isLoading,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSend();
  };

  return (
    <section className="screen dialogue-screen">
      <div className="dialogue-header">
        <div>
          <p className="eyebrow">Etape 3</p>
          <h2>Dialogue alterne</h2>
        </div>
        <ConvergenceMeter score={convergenceScore} label="Convergence" />
      </div>

      <div className="messages-panel" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty-chat">
            <p>Ecris ton premier message pour lancer l echange.</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} role={message.role} text={message.text} />
        ))}

        {isLoading && (
          <div className="thinking-row" aria-label="IA en cours de reponse">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </div>
        )}

        <div ref={endRef} />
      </div>

      <form className="dialogue-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Exprime ce que tu veux faire comprendre..."
          className="dialogue-input"
          disabled={isLoading}
        />
        <button className="btn btn-primary" type="submit" disabled={isLoading || !draft.trim()}>
          Envoyer
        </button>
      </form>

      <div className="actions-row">
        <button className="btn btn-secondary" onClick={onBack} disabled={isLoading}>
          Retour miroir
        </button>
        <button className="btn btn-primary" onClick={onGenerateSynthesis} disabled={isLoading || !messages.length}>
          Finaliser la synthese
        </button>
      </div>
    </section>
  );
}

export default DialogueMode;