function ConvergenceMeter({ score = 0, label = "Convergence" }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));

  return (
    <div className="meter-shell" aria-label={label}>
      <span className="meter-label">{label}</span>
      <div className="meter-track">
        <div className="meter-fill pulse-soft" style={{ width: `${safeScore}%` }} />
      </div>
      <span className="meter-value">{safeScore}%</span>
    </div>
  );
}

export default ConvergenceMeter;