import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldOff, ArrowUpRight, ArrowLeft } from "lucide-react";
import { RiskBadge } from "../components/RiskBanner";

const STATUS_CONFIG = {
  SUCCESS: {
    icon: CheckCircle2,
    iconColor: "var(--color-safe)",
    bgColor: "var(--color-safe-tint)",
    borderColor: "rgba(52, 199, 89, 0.3)",
    title: "Transfer Dispatched",
    description: "Your funds have cleared the fraud-prevention layer and been authorized for settlement.",
  },
  FAILED: {
    icon: XCircle,
    iconColor: "var(--color-danger)",
    bgColor: "var(--color-danger-tint)",
    borderColor: "rgba(255, 59, 48, 0.3)",
    title: "Transfer Authorization Failed",
    description: "The transaction could not be completed. Please review your account credentials and retry.",
  },
  BLOCKED: {
    icon: ShieldOff,
    iconColor: "var(--color-danger)",
    bgColor: "var(--color-danger-tint)",
    borderColor: "rgba(255, 59, 48, 0.3)",
    title: "Transfer Intercepted & Blocked",
    description: "SafePay halted this transfer because verification credentials (OTP or recap acknowledgment) failed validation.",
  },
};

export default function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    navigate("/");
    return null;
  }

  const { status, transactionId, timestamp, payeeName, amount, riskLevel, riskScore } = state;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.FAILED;
  const Icon = cfg.icon;

  return (
    <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center" }}>
      {/* ── Status Icon ── */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: cfg.bgColor,
          border: `1px solid ${cfg.borderColor}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: cfg.iconColor,
          marginBottom: 20,
        }}
      >
        <Icon size={38} />
      </div>

      <h1 className="typography-display" style={{ marginBottom: 8 }}>
        {cfg.title}
      </h1>
      <p style={{ fontSize: 16, color: "var(--color-body-muted)", maxWidth: 440, margin: "0 auto 32px" }}>
        {cfg.description}
      </p>

      {/* ── Apple Receipt Card ── */}
      <div className="store-utility-card" style={{ textAlign: "left", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Official Transfer Receipt
          </span>
          {riskLevel && <RiskBadge level={riskLevel} />}
        </div>

        <div className="apple-spec-table" style={{ margin: "12px 0 0" }}>
          <div className="apple-spec-row">
            <span className="apple-spec-key">Recipient</span>
            <span className="apple-spec-value">{payeeName}</span>
          </div>

          <div className="apple-spec-row">
            <span className="apple-spec-key">Amount</span>
            <span className="apple-spec-value" style={{ fontSize: 22, fontWeight: 600 }}>
              ₹{amount?.toLocaleString("en-IN")}
            </span>
          </div>

          {transactionId && (
            <div className="apple-spec-row">
              <span className="apple-spec-key">Transaction Identifier</span>
              <span className="apple-spec-value" style={{ fontFamily: "monospace", fontSize: 13 }}>
                {transactionId}
              </span>
            </div>
          )}

          <div className="apple-spec-row">
            <span className="apple-spec-key">Security Status</span>
            <span
              className="apple-spec-value"
              style={{
                color: status === "SUCCESS" ? "var(--color-safe)" : "var(--color-danger)",
              }}
            >
              {status}
            </span>
          </div>

          <div className="apple-spec-row">
            <span className="apple-spec-key">Timestamp</span>
            <span className="apple-spec-value" style={{ fontSize: 13 }}>
              {new Date(timestamp || Date.now()).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "medium",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="button-primary"
          onClick={() => navigate("/")}
          style={{ padding: "12px 28px" }}
        >
          Return to Payees
        </button>
        <button
          type="button"
          className="button-secondary-pill"
          onClick={() => navigate("/history")}
          style={{ padding: "12px 24px" }}
        >
          View Activity History
          <ArrowUpRight size={15} />
        </button>
      </div>
    </div>
  );
}
