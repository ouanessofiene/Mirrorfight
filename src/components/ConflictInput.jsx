function ConflictInput({
  conflictDescription,
  onConflictChange,
  onGenerateMirror,
  onUseExample,
  isLoading,
}) {
  const canSubmit = conflictDescription.trim().length > 0 && !isLoading;

  return (
    <section className="screen input-screen">
      <p className="eyebrow">Etape 1</p>
      <h2>Decris le conflit avec tes mots</h2>
      <p className="input-helper">
        Plus le contexte est concret, plus la perspective adverse sera precise emotionnellement.
      </p>

      <label className="field-label" htmlFor="conflict-input">
        Situation
      </label>
      <textarea
        id="conflict-input"
        className="conflict-input"
        rows={8}
        value={conflictDescription}
        onChange={(event) => onConflictChange(event.target.value)}
        placeholder="Exemple: Quand je raconte ma journee, tu regardes ton telephone et j ai l impression de ne pas exister."
      />

      <div className="actions-row">
        <button className="btn btn-secondary" onClick={onUseExample} disabled={isLoading}>
          Essayer un exemple
        </button>
        <button className="btn btn-primary" onClick={onGenerateMirror} disabled={!canSubmit}>
          {isLoading ? "Generation..." : "Voir l autre cote"}
        </button>
      </div>
    </section>
  );
}

export default ConflictInput;