function IntroScreen({ onStart }) {
  return (
    <section className="screen intro-screen">
      <p className="eyebrow">Prototype hackathon</p>
      <h2>Vois ton conflit depuis l autre cote</h2>
      <p className="lead">
        MirrorFight transforme une tension relationnelle en miroir emotionnel, puis en dialogue alterne jusqu a
        convergence ou impasse.
      </p>
      <div className="intro-highlight">
        <p>Parcours: decrire, mirrorer, dialoguer, synthetiser.</p>
      </div>
      <div className="actions-row">
        <button className="btn btn-primary" onClick={onStart}>
          Commencer
        </button>
      </div>
    </section>
  );
}

export default IntroScreen;