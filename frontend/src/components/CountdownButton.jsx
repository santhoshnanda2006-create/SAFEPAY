import { useState, useEffect } from "react";

const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CountdownButton({
  seconds = 30,
  onComplete,
  disabled,
  children,
  onClick,
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (remaining <= 0) {
      setDone(true);
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onComplete]);

  const progress = ((seconds - remaining) / seconds) * CIRCUMFERENCE;

  const handleSkipDemo = () => {
    setRemaining(0);
    setDone(true);
    onComplete?.();
  };

  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      {!done ? (
        <div style={{ marginBottom: 20 }}>
          <div className="apple-countdown-ring">
            <svg viewBox="0 0 72 72">
              <circle className="apple-countdown-bg" cx="36" cy="36" r={RADIUS} />
              <circle
                className="apple-countdown-progress"
                cx="36"
                cy="36"
                r={RADIUS}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE - progress}
              />
            </svg>
            <div className="apple-countdown-text">{remaining}</div>
          </div>
          <div style={{ fontSize: 14, color: "var(--color-ink)", fontWeight: 600, marginBottom: 4 }}>
            Mandatory Cooling-Off Period
          </div>
          <p style={{ fontSize: 13, color: "var(--color-body-muted)", marginBottom: 8 }}>
            High-risk transfers require a 30-second reflection delay to counter coercion and imposter scams.
          </p>
          <button
            type="button"
            onClick={handleSkipDemo}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Judge/Demo shortcut: Skip countdown
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <span className="apple-chip chip-risk-low" style={{ fontSize: 13, padding: "5px 14px" }}>
            ✓ Cooling-off period completed
          </span>
        </div>
      )}

      <button
        type="button"
        className="button-danger-pill"
        style={{ width: "100%", padding: "14px 24px", fontSize: 16 }}
        disabled={!done || disabled}
        onClick={onClick}
      >
        {children}
      </button>
    </div>
  );
}
