import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck, ShieldAlert, AlertTriangle, Loader2, Lock, ArrowUpRight } from "lucide-react";
import { executeTransfer } from "../api";
import RiskBanner, { RiskBadge } from "../components/RiskBanner";
import VerifiedBadge from "../components/VerifiedBadge";
import CountdownButton from "../components/CountdownButton";
import OtpInput from "../components/OtpInput";

export default function RiskReview() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdownDone, setCountdownDone] = useState(false);

  if (!state?.evaluation) {
    navigate("/");
    return null;
  }

  const { evaluation, payeeName, amount } = state;
  const {
    evaluationId,
    riskLevel,
    riskScore,
    isNewPayee,
    payeeVerified,
    payeeAccountAgeDays,
    requiredSteps = [],
    reasons = [],
  } = evaluation;

  const isLow = riskLevel === "LOW";
  const isMedium = riskLevel === "MEDIUM";
  const isHigh = riskLevel === "HIGH";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const body = {
        evaluationId,
        verification: {
          otp: isHigh ? otp : null,
          confirmedRecap: true,
        },
      };
      const result = await executeTransfer(body);
      navigate("/result", {
        state: {
          ...result,
          payeeName,
          amount,
          riskLevel,
          riskScore,
          reasons,
        },
      });
    } catch (err) {
      console.error("Execute failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      <button
        type="button"
        className="button-secondary-pill"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 24, padding: "6px 14px", fontSize: 13 }}
      >
        <ArrowLeft size={14} />
        Back to Edit
      </button>

      {/* ─── LOW RISK: ONE-TAP STREAMLINED AUTHORIZATION ─── */}
      {isLow && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: "var(--color-safe-tint)",
                border: "1px solid rgba(52, 199, 89, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-safe)",
                marginBottom: 16,
              }}
            >
              <ShieldCheck size={32} />
            </div>
            <h1 className="typography-display" style={{ marginBottom: 6 }}>
              Routine Transfer Authorized
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-body-muted)" }}>
              No risk anomalies detected. Standard single-tap instant execution enabled.
            </p>
          </div>

          <div className="store-utility-card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Summary
              </span>
              <RiskBadge level={riskLevel} />
            </div>

            <div className="apple-spec-table" style={{ margin: "12px 0 0" }}>
              <div className="apple-spec-row">
                <span className="apple-spec-key">Recipient</span>
                <div className="apple-spec-value">
                  <span>{payeeName}</span>
                  <VerifiedBadge verified={payeeVerified} />
                  {isNewPayee && <span className="apple-chip chip-new">New</span>}
                </div>
              </div>

              <div className="apple-spec-row">
                <span className="apple-spec-key">Transfer Amount</span>
                <span className="apple-spec-value" style={{ fontSize: 20 }}>
                  ₹{amount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="apple-spec-row">
                <span className="apple-spec-key">Risk Evaluation</span>
                <span className="apple-spec-value" style={{ color: "var(--color-safe)" }}>
                  0 Friction • Instant Dispatch
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="button-success-pill"
            style={{ width: "100%", padding: "14px 24px", fontSize: 16 }}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Authorizing Transfer...
              </>
            ) : (
              <>
                <Lock size={16} />
                One-Tap Authorize (₹{amount.toLocaleString("en-IN")})
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── MEDIUM RISK: EXPLICIT RECAP CONFIRMATION ─── */}
      {isMedium && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 className="typography-display" style={{ marginBottom: 6 }}>
              Review Transfer Details
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-body-muted)" }}>
              Step-up friction applied: mandatory recipient recap verification
            </p>
          </div>

          <RiskBanner level="MEDIUM" reasons={reasons} />

          <div className="store-utility-card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Recipient Verification
              </span>
              <RiskBadge level={riskLevel} />
            </div>

            <div className="apple-spec-table" style={{ margin: "12px 0 0" }}>
              <div className="apple-spec-row">
                <span className="apple-spec-key">Payee Name</span>
                <div className="apple-spec-value">
                  <span>{payeeName}</span>
                  <VerifiedBadge verified={payeeVerified} />
                  {isNewPayee && <span className="apple-chip chip-new">New Payee</span>}
                </div>
              </div>

              {payeeAccountAgeDays != null && (
                <div className="apple-spec-row">
                  <span className="apple-spec-key">Payee Account Age</span>
                  <span className="apple-spec-value">{payeeAccountAgeDays} days active</span>
                </div>
              )}

              <div className="apple-spec-row">
                <span className="apple-spec-key">Transfer Amount</span>
                <span className="apple-spec-value" style={{ fontSize: 20 }}>
                  ₹{amount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="apple-spec-row">
                <span className="apple-spec-key">Calculated Risk Score</span>
                <span className="apple-spec-value" style={{ color: "var(--color-caution)" }}>
                  {riskScore} / 100
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="button-primary"
            style={{ width: "100%", padding: "14px 24px", fontSize: 16 }}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Executing Transfer...
              </>
            ) : (
              <>
                Confirm & Authorize Transfer
                <ArrowUpRight size={18} />
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── HIGH RISK: CRITICAL MULTI-TIER FRICTION (PITCH CENTERPIECE) ─── */}
      {isHigh && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 className="typography-display" style={{ marginBottom: 6, color: "var(--color-danger)" }}>
              High-Risk Friction Layer
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-body-muted)" }}>
              Stepped-up verification enforced: 30-Second Reflection Delay + OTP Auth
            </p>
          </div>

          {/* Prominent Red Alert Box */}
          <RiskBanner level="HIGH" reasons={reasons} />

          {/* Stepped-Up Requirements Checklist */}
          <div
            style={{
              backgroundColor: "var(--color-canvas)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--radius-lg)",
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Adaptive Security Protocol Activated:
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
              <div style={{ padding: "10px 12px", borderRadius: 8, backgroundColor: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)" }}>
                <div style={{ fontSize: 11, color: "#248a3d", fontWeight: 700 }}>STEP 1</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Recap Review</div>
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 8, backgroundColor: countdownDone ? "rgba(52,199,89,0.08)" : "rgba(255,59,48,0.08)", border: `1px solid ${countdownDone ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.2)"}` }}>
                <div style={{ fontSize: 11, color: countdownDone ? "#248a3d" : "var(--color-danger)", fontWeight: 700 }}>
                  STEP 2 {countdownDone && "✓"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>30s Cooling-Off</div>
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 8, backgroundColor: otp.length === 6 ? "rgba(52,199,89,0.08)" : "rgba(0,102,204,0.08)", border: `1px solid ${otp.length === 6 ? "rgba(52,199,89,0.2)" : "rgba(0,102,204,0.2)"}` }}>
                <div style={{ fontSize: 11, color: otp.length === 6 ? "#248a3d" : "var(--color-primary)", fontWeight: 700 }}>
                  STEP 3 {otp.length === 6 && "✓"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>2-Factor OTP</div>
              </div>
            </div>
          </div>

          {/* Recipient Spec Table */}
          <div className="store-utility-card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Transaction Snapshot
              </span>
              <RiskBadge level={riskLevel} />
            </div>

            <div className="apple-spec-table" style={{ margin: "12px 0 0" }}>
              <div className="apple-spec-row">
                <span className="apple-spec-key">Recipient</span>
                <div className="apple-spec-value">
                  <span>{payeeName}</span>
                  <VerifiedBadge verified={payeeVerified} />
                  {isNewPayee && <span className="apple-chip chip-new">New Payee</span>}
                </div>
              </div>

              {payeeAccountAgeDays != null && (
                <div className="apple-spec-row">
                  <span className="apple-spec-key">Account History</span>
                  <span className="apple-spec-value">{payeeAccountAgeDays} days on platform</span>
                </div>
              )}

              <div className="apple-spec-row">
                <span className="apple-spec-key">Transfer Sum</span>
                <span className="apple-spec-value" style={{ fontSize: 22, color: "var(--color-danger)" }}>
                  ₹{amount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="apple-spec-row">
                <span className="apple-spec-key">Composite Risk Score</span>
                <span className="apple-spec-value" style={{ color: "var(--color-danger)" }}>
                  {riskScore} / 100 (HIGH)
                </span>
              </div>
            </div>
          </div>

          {/* OTP Input Card */}
          <div className="store-utility-card" style={{ marginBottom: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--color-ink)", marginBottom: 4 }}>
                Enter One-Time Password
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-body-muted)" }}>
                A security token was dispatched to your registered authenticator device
              </p>
            </div>

            <OtpInput value={otp} onChange={setOtp} />
          </div>

          {/* 30-Second Countdown & Confirmation Button */}
          <div className="store-utility-card" style={{ padding: "28px 24px" }}>
            <CountdownButton
              seconds={30}
              onComplete={() => setCountdownDone(true)}
              disabled={loading || otp.length < 6}
              onClick={handleConfirm}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Verifying Cryptographic OTP...
                </>
              ) : (
                <>
                  <ShieldAlert size={18} />
                  Confirm & Execute High-Risk Transfer
                </>
              )}
            </CountdownButton>
          </div>
        </div>
      )}
    </div>
  );
}
