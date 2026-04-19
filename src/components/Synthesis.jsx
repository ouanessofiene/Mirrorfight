function Synthesis({ synthesis, onBack, onRestart }) {
  return (
    <section className="screen synthesis-screen">
      <p className="eyebrow">Etape 4</p>
      <h2>Synthese honnete du conflit</h2>

      <div className="synthesis-grid">
        <div className="synthesis-column">
          <h3>Ce qui peut etre resolu</h3>
          <ul>
            {(synthesis?.resolvable || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="synthesis-column synthesis-column-danger">
          <h3>Ce qui ne peut pas l etre</h3>
          <ul>
            {(synthesis?.unresolvable || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="insight-card">
        <h3>Insight</h3>
        <p>{synthesis?.insight || "Aucun insight disponible."}</p>
      </div>

      <div className="insight-card">
        <h3>Recommendation</h3>
        <p>{synthesis?.recommendation || "Aucune recommandation disponible."}</p>
      </div>

      <div className="actions-row">
        <button className="btn btn-secondary" onClick={onBack}>
          Retour dialogue
        </button>
        <button className="btn btn-primary" onClick={onRestart}>
          Recommencer
        </button>
      </div>
    </section>
  );
}

export default Synthesis;