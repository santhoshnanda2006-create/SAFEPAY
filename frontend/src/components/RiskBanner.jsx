import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

const CONFIG = {
  LOW: {
    icon: ShieldCheck,
    className: "chip-risk-low",
    label: "Low Risk",
  },
  MEDIUM: {
    icon: AlertTriangle,
    className: "chip-risk-medium",
    label: "Medium Risk",
  },
  HIGH: {
    icon: ShieldAlert,
    className: "chip-risk-high",
    label: "Elevated Risk",
  },
};

export function RiskBadge({ level }) {
  const cfg = CONFIG[level] || CONFIG.LOW;
  const Icon = cfg.icon;
  return (
    <span className={`apple-chip ${cfg.className}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export default function RiskBanner({ level, reasons }) {
  if (level === "LOW") return null;

  const isHigh = level === "HIGH";

  return (
    <div className={`security-alert-box ${isHigh ? "" : "security-alert-caution"}`}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: isHigh ? "rgba(255, 59, 48, 0.1)" : "rgba(255, 149, 0, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isHigh ? "var(--color-danger)" : "var(--color-caution)",
            flexShrink: 0,
          }}
        >
          {isHigh ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
              {isHigh ? "Security Verification Triggered" : "Unusual Transfer Pattern Detected"}
            </h2>
            <RiskBadge level={level} />
          </div>

          <p style={{ fontSize: 14, color: "var(--color-body-muted)", lineHeight: 1.5, marginBottom: 12 }}>
            {isHigh
              ? "SafePay detected anomalies inconsistent with your typical transfer profile. Additional friction has been enforced to safeguard your funds."
              : "Please verify the transfer summary below before proceeding with authorization."}
          </p>

          {reasons && reasons.length > 0 && (
            <div className="reasons-container" style={{ margin: "12px 0 0" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Risk Factors Detected
              </div>
              {reasons.map((r, i) => (
                <div key={i} className="reason-item">
                  <div
                    className={`reason-bullet ${
                      isHigh ? "reason-bullet-danger" : "reason-bullet-caution"
                    }`}
                  />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
