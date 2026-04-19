import ConvergenceMeter from "./ConvergenceMeter.jsx";

function MirrorView({ mirrorData, onBack, onContinue }) {
  const emotions = Array.isArray(mirrorData?.emotions_detected) ? mirrorData.emotions_detected : [];
  const needs = Array.isArray(mirrorData?.needs) ? mirrorData.needs : [];
  const misunderstandings = Array.isArray(mirrorData?.misunderstandings) ? mirrorData.misunderstandings : [];

  return (
    <section className="screen mirror-screen">
      <p className="eyebrow">Etape 2</p>
      <h2>Perspective adverse</h2>

      <div className="mirror-card reveal-in">
        <p>{mirrorData?.perspective || "La perspective adverse apparaitra ici."}</p>
      </div>

      <div className="emotion-list" aria-label="Emotions detectees">
        {emotions.map((emotion) => (
          <span key={emotion} className="emotion-pill">
            {emotion}
          </span>
        ))}
      </div>

      <div className="tension-card">
        <h3>Tension centrale</h3>
        <p>{mirrorData?.key_tension || "Aucune tension centrale detectee."}</p>
      </div>

      {(needs.length > 0 || misunderstandings.length > 0) && (
        <div className="mirror-details-grid">
          <div className="tension-card">
            <h3>Besoins possibles</h3>
            <ul className="compact-list">
              {needs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="tension-card">
            <h3>Malentendus probables</h3>
            <ul className="compact-list">
              {misunderstandings.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ConvergenceMeter score={mirrorData?.convergence_score || 0} label="Convergence initiale" />

      <div className="actions-row">
        <button className="btn btn-secondary" onClick={onBack}>
          Modifier le conflit
        </button>
        <button className="btn btn-primary" onClick={onContinue}>
          Passer au dialogue
        </button>
      </div>
    </section>
  );
}

export default MirrorView;