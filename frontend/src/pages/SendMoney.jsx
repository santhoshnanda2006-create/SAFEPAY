import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  UserCheck,
  UserX,
  AlertTriangle,
  Info,
  Volume2
} from "lucide-react";
import { getContacts, evaluateTransfer } from "../api";
import TrustBadge from "../components/TrustBadge";
import VerifiedBadge from "../components/VerifiedBadge";

export default function SendMoney() {
  const { accountId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Payee Customization Mode: 'existing' vs 'custom'
  const [isCustomPayee, setIsCustomPayee] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUpi, setCustomUpi] = useState("");
  const [customTrustLevel, setCustomTrustLevel] = useState("NEW"); // NEW, REGULAR, TRUSTED
  const [customIsVerified, setCustomIsVerified] = useState(false);

  // Demo context overrides (Simulation controls)
  const [showSimControls, setShowSimControls] = useState(false);
  const [simDevice, setSimDevice] = useState("KNOWN-DEVICE");
  const [simCity, setSimCity] = useState("Chennai");
  const [simOddHour, setSimOddHour] = useState(false);

  useEffect(() => {
    getContacts().then((data) => {
      setContacts(data);
      if (accountId) {
        const found = data.find(
          (c) =>
            c.accountId === accountId ||
            c.accountId.replace(/[^0-9]/g, "") === accountId.replace(/[^0-9]/g, "")
        );
        if (found) {
          setSelectedContact(found);
          setIsCustomPayee(false);
        }
      }
      const presetAmt = searchParams.get("presetAmt");
      if (presetAmt) {
        setAmount(presetAmt);
      }
      setLoadingContacts(false);
    });
  }, [accountId, searchParams]);

  // Live real-time risk calculation preview (governed strictly by amount, not recipient)
  const liveEstimate = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    let score = 0;
    let level = "LOW";
    let frictionTitle = "";
    let frictionDesc = "";
    let color = "var(--color-safe)";
    let icon = Zap;
    const signals = [];

    let isKyc, trust, payeeLabel;
    if (isCustomPayee) {
      trust = customTrustLevel;
      isKyc = customIsVerified;
      payeeLabel = customName || "Custom Payee";
    } else if (selectedContact) {
      isKyc = selectedContact.isVerified;
      trust = selectedContact.trustLevel;
      payeeLabel = selectedContact.displayName;
    } else {
      isKyc = false;
      trust = "NEW";
      payeeLabel = "Selected Payee";
    }

    // ── Primary risk level strictly determined by transfer amount ──
    if (amt >= 50000) {
      level = "HIGH";
      color = "var(--color-danger)";
      icon = ShieldAlert;
      score = Math.min(100, 65 + Math.round((amt - 50000) / 2500));
      frictionTitle = "30s Reflection Delay + 2FA OTP Required";
      frictionDesc = "High-value transfer (≥ ₹50,000). Enforces mandatory 30-second cooling-off reflection delay and 6-digit OTP.";
      signals.push({ text: `High-value transfer: ₹${amt.toLocaleString("en-IN")} exceeds ₹50,000 security threshold`, type: "risk" });
      if (amt >= 100000) {
        signals.push({ text: "Critical amount threshold exceeded (≥ ₹1,00,000)", type: "risk" });
      }
    } else if (amt >= 10000) {
      level = "MEDIUM";
      color = "var(--color-caution)";
      icon = ShieldCheck;
      score = 25 + Math.round(((amt - 10000) / 40000) * 20);
      frictionTitle = "Mandatory Recipient Recap Review";
      frictionDesc = "Moderate risk transfer (₹10,000 – ₹49,999). Requires reviewing recipient identity and account recap before dispatch.";
      signals.push({ text: `Elevated transfer amount: ₹${amt.toLocaleString("en-IN")} requires recipient recap review (threshold ₹10,000)`, type: "risk" });
    } else {
      level = "LOW";
      color = "var(--color-safe)";
      icon = Zap;
      score = Math.max(0, Math.round((amt / 10000) * 15));
      frictionTitle = "Instant 1-Tap Execution (0 Friction)";
      frictionDesc = "Routine transfer amount (< ₹10,000). Instant 1-tap dispatch without cooling-off delays or OTP.";
      signals.push({ text: `Routine transfer amount: ₹${amt.toLocaleString("en-IN")} (< ₹10,000 threshold)`, type: "neutral" });
    }

    // Informational recipient profile tag for recap
    signals.push({
      text: `Payee Profile: ${payeeLabel} (${trust} · ${isKyc ? "KYC Verified" : "Unverified"})`,
      type: "neutral",
    });

    if (simDevice === "NEW-DEVICE") {
      score = Math.min(100, score + 20);
      signals.push({ text: "Unrecognized device fingerprint detected (+20)", type: "risk" });
      if (level === "MEDIUM") {
        level = "HIGH";
        color = "var(--color-danger)";
        icon = ShieldAlert;
        frictionTitle = "30s Reflection Delay + 2FA OTP Required";
        frictionDesc = "Environmental anomaly escalated risk to HIGH. Enforces mandatory 30s cooling-off delay and 6-digit OTP.";
      } else if (level === "LOW" && score >= 25) {
        level = "MEDIUM";
        color = "var(--color-caution)";
        icon = ShieldCheck;
        frictionTitle = "Mandatory Recipient Recap Review";
        frictionDesc = "Environmental anomaly escalated risk to MEDIUM. Requires reviewing recipient recap.";
      }
    }
    if (simCity.toLowerCase() !== "chennai") {
      score = Math.min(100, score + 20);
      signals.push({ text: `Unusual location detected: ${simCity} (+20)`, type: "risk" });
      if (level === "MEDIUM") {
        level = "HIGH";
        color = "var(--color-danger)";
        icon = ShieldAlert;
        frictionTitle = "30s Reflection Delay + 2FA OTP Required";
        frictionDesc = "Environmental anomaly escalated risk to HIGH. Enforces mandatory 30s cooling-off delay and 6-digit OTP.";
      } else if (level === "LOW" && score >= 25) {
        level = "MEDIUM";
        color = "var(--color-caution)";
        icon = ShieldCheck;
        frictionTitle = "Mandatory Recipient Recap Review";
        frictionDesc = "Environmental anomaly escalated risk to MEDIUM. Requires reviewing recipient recap.";
      }
    }
    if (simOddHour) {
      score = Math.min(100, score + 10);
      signals.push({ text: "Unusual late-night transaction time (02:30 AM) (+10)", type: "risk" });
    }

    score = Math.max(0, Math.min(100, score));

    return { score, level, color, icon, frictionTitle, frictionDesc, signals };
  }, [amount, isCustomPayee, customName, customTrustLevel, customIsVerified, selectedContact, simDevice, simCity, simOddHour]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    setLoading(true);
    try {
      const timestamp = simOddHour
        ? "2026-09-04T02:30:00.000Z"
        : new Date().toISOString();

      const payeeName = isCustomPayee
        ? customName || "Custom Payee"
        : selectedContact?.displayName || "Recipient";

      const payeeUpi = isCustomPayee
        ? customUpi || "custom@upi"
        : selectedContact?.upiId || "recipient@upi";

      const payeeId = isCustomPayee
        ? `CUSTOM-${Date.now()}`
        : selectedContact?.accountId || `ACC-${Date.now()}`;

      const body = {
        senderId: "SENDER-001",
        payeeAccountId: payeeId,
        payeeUpiId: payeeUpi,
        payeeDisplayName: payeeName,
        amount: amt,
        deviceId: simDevice === "NEW-DEVICE" ? "NEW-DEVICE-IPHONE17" : "DEVICE-001",
        location: {
          lat: simCity === "Mumbai" ? 19.076 : 13.0827,
          lng: simCity === "Mumbai" ? 72.8777 : 80.2707,
          city: simCity,
        },
        timestamp,
        isCustomPayee,
        customTrustLevel: isCustomPayee ? customTrustLevel : undefined,
        customIsVerified: isCustomPayee ? customIsVerified : undefined,
      };

      const evaluation = await evaluateTransfer(body);

      navigate("/review", {
        state: {
          evaluation,
          payeeName: body.payeeDisplayName,
          amount: amt,
        },
      });
    } catch (err) {
      console.error("Evaluate failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    (selectedContact || (isCustomPayee && customName.trim())) &&
    amount &&
    parseFloat(amount) > 0;

  const currentNumericAmount = parseFloat(amount) || 0;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      {/* ── Back Navigation ── */}
      <button
        type="button"
        className="button-secondary-pill"
        onClick={() => navigate("/")}
        style={{ marginBottom: 24, padding: "6px 14px", fontSize: 13 }}
      >
        <ArrowLeft size={14} />
        Back to Payees
      </button>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 className="typography-display" style={{ marginBottom: 6 }}>
          Transfer Funds
        </h1>
        <p style={{ fontSize: 15, color: "var(--color-body-muted)" }}>
          Adaptive fraud prevention with real-time risk calculation
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Card 1: Amount Customization ── */}
        <div
          className="store-utility-card"
          style={{ textAlign: "center", padding: "30px 24px 24px", marginBottom: 20 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              1. Transfer Amount (INR)
            </span>
            <span style={{ fontSize: 12, color: "var(--color-body-muted)", fontWeight: 600 }}>
              {currentNumericAmount >= 50000 ? "🔴 High Risk Tier (≥ ₹50,000)" : currentNumericAmount >= 10000 ? "🟡 Medium Risk Tier (₹10,000 – ₹49,999)" : "🟢 Low Risk Tier (< ₹10,000)"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 300, color: "var(--color-body-muted)", marginRight: 4 }}>
              ₹
            </span>
            <input
              type="number"
              className="apple-input-hero"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max="500000"
              autoFocus
              style={{
                width: "100%",
                maxWidth: 340,
                border: "none",
                background: "transparent",
                outline: "none",
                color: "var(--color-ink)",
              }}
            />
          </div>

          {/* Amount Slider for smooth interactive testing */}
          <div style={{ margin: "0 auto 16px", maxWidth: 420, padding: "0 10px" }}>
            <input
              type="range"
              min="100"
              max="100000"
              step="500"
              value={currentNumericAmount > 100000 ? 100000 : currentNumericAmount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", cursor: "pointer", accentColor: liveEstimate.color }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-body-muted)", marginTop: 4 }}>
              <span>₹100 (Low)</span>
              <span>₹25k (Medium)</span>
              <span>₹50k+ (High)</span>
              <span>₹1,00,000</span>
            </div>
          </div>

          {/* Quick preset chips */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {[
              { val: 500, label: "₹500 (Routine)" },
              { val: 2500, label: "₹2,500 (Average)" },
              { val: 12000, label: "₹12,000 (Medium)" },
              { val: 65000, label: "₹65,000 (High)" },
              { val: 120000, label: "₹1,20,000 (Critical)" },
            ].map(({ val, label }) => (
              <button
                key={val}
                type="button"
                className={`button-pearl-capsule ${currentNumericAmount === val ? "active" : ""}`}
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  borderColor: currentNumericAmount === val ? liveEstimate.color : undefined,
                  fontWeight: currentNumericAmount === val ? 700 : 500,
                }}
                onClick={() => setAmount(String(val))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card 2: Payee Customization ── */}
        <div className="store-utility-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              2. Recipient Customization
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setIsCustomPayee(false)}
                className={`button-pearl-capsule ${!isCustomPayee ? "active" : ""}`}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  backgroundColor: !isCustomPayee ? "var(--color-ink)" : "transparent",
                  color: !isCustomPayee ? "#fff" : "var(--color-ink)",
                }}
              >
                Address Book
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomPayee(true);
                  if (!customName) setCustomName("Custom Recipient");
                  if (!customUpi) setCustomUpi("recipient@okhdfcbank");
                }}
                className={`button-pearl-capsule ${isCustomPayee ? "active" : ""}`}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  backgroundColor: isCustomPayee ? "var(--color-primary)" : "transparent",
                  color: isCustomPayee ? "#fff" : "var(--color-ink)",
                }}
              >
                + Custom Payee
              </button>
            </div>
          </div>

          {!isCustomPayee ? (
            <div>
              {loadingContacts ? (
                <div style={{ height: 48, backgroundColor: "var(--color-canvas-parchment)", borderRadius: 8 }} />
              ) : (
                <select
                  className="apple-input"
                  value={selectedContact?.accountId || ""}
                  onChange={(e) => {
                    const c = contacts.find((x) => x.accountId === e.target.value);
                    setSelectedContact(c || null);
                  }}
                  style={{ cursor: "pointer", fontSize: 15 }}
                >
                  <option value="">Select recipient from address book...</option>
                  {contacts.map((c) => (
                    <option key={c.accountId} value={c.accountId}>
                      {c.displayName} ({c.trustLevel} · {c.isVerified ? "Verified" : "Unverified"} · {c.upiId})
                    </option>
                  ))}
                </select>
              )}

              {selectedContact && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 16px",
                    backgroundColor: "var(--color-canvas-parchment)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-hairline)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedContact.displayName}</span>
                      <VerifiedBadge verified={selectedContact.isVerified} />
                      <TrustBadge level={selectedContact.trustLevel} />
                    </div>
                    <span style={{ fontSize: 12, color: "var(--color-body-muted)" }}>
                      {selectedContact.transferCount} past transfers
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-body-muted)", fontFamily: "monospace", marginTop: 4 }}>
                    UPI: {selectedContact.upiId || selectedContact.accountId}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink-muted-80)", marginBottom: 4, display: "block" }}>
                  Payee Display Name
                </label>
                <input
                  className="apple-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink-muted-80)", marginBottom: 4, display: "block" }}>
                  UPI ID / Account
                </label>
                <input
                  className="apple-input"
                  placeholder="e.g. ramesh@okaxis"
                  value={customUpi}
                  onChange={(e) => setCustomUpi(e.target.value)}
                />
              </div>

              {/* Payee Relationship & Trust Attribute Customizers */}
              <div
                style={{
                  backgroundColor: "var(--color-canvas-parchment)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 14px",
                  border: "1px solid var(--color-hairline)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Recipient Trust Status (for recap):</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["NEW", "REGULAR", "TRUSTED"].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCustomTrustLevel(level)}
                        className={`button-pearl-capsule ${customTrustLevel === level ? "active" : ""}`}
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          backgroundColor: customTrustLevel === level ? (level === "TRUSTED" ? "var(--color-safe)" : level === "NEW" ? "var(--color-danger)" : "var(--color-caution)") : undefined,
                          color: customTrustLevel === level ? "#fff" : undefined,
                          borderColor: customTrustLevel === level ? "transparent" : undefined,
                        }}
                      >
                        {level === "NEW" ? "New Contact" : level === "REGULAR" ? "Regular Contact" : "Trusted Contact"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>KYC Verified Match:</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setCustomIsVerified(true)}
                      className={`button-pearl-capsule ${customIsVerified ? "active" : ""}`}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        backgroundColor: customIsVerified ? "var(--color-safe)" : undefined,
                        color: customIsVerified ? "#fff" : undefined,
                      }}
                    >
                      ✓ KYC Verified
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomIsVerified(false)}
                      className={`button-pearl-capsule ${!customIsVerified ? "active" : ""}`}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        backgroundColor: !customIsVerified ? "rgba(0,0,0,0.06)" : undefined,
                      }}
                    >
                      Unverified
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "var(--color-body-muted)", lineHeight: 1.4, borderTop: "1px solid var(--color-hairline)", paddingTop: 8 }}>
                  💡 <strong>Amount-Based Risk Rule:</strong> Recipient profile metadata is captured for your recap review. Risk tier (Low, Medium, High) and verification friction are detected strictly by the transfer amount.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Card 3: LIVE RISK CALCULATION & ADAPTIVE FRICTION PREVIEW ── */}
        <div
          style={{
            backgroundColor: "var(--color-canvas)",
            border: `2px solid ${liveEstimate.color}`,
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            marginBottom: 20,
            boxShadow: `0 4px 20px ${liveEstimate.color === "var(--color-danger)" ? "rgba(255, 59, 48, 0.12)" : liveEstimate.color === "var(--color-caution)" ? "rgba(255, 149, 0, 0.12)" : "rgba(52, 199, 89, 0.12)"}`,
            transition: "all 0.25s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <liveEstimate.icon size={20} color={liveEstimate.color} />
              <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: liveEstimate.color }}>
                Real-Time Risk Calculation
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: liveEstimate.color }}>
                {liveEstimate.score} / 100
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  backgroundColor: liveEstimate.color,
                  color: "#fff",
                }}
              >
                {liveEstimate.level} RISK
              </span>
            </div>
          </div>

          {/* Animated Risk Score Meter Bar */}
          <div
            style={{
              height: 8,
              backgroundColor: "rgba(0,0,0,0.06)",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(5, liveEstimate.score)}%`,
                backgroundColor: liveEstimate.color,
                borderRadius: 4,
                transition: "width 0.3s ease, background-color 0.3s ease",
              }}
            />
          </div>

          {/* Dynamic Friction Explanation */}
          <div
            style={{
              backgroundColor: "var(--color-canvas-parchment)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 14px",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
              Expected Friction: {liveEstimate.frictionTitle}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-body-muted)", lineHeight: 1.4 }}>
              {liveEstimate.frictionDesc}
            </div>
          </div>

          {/* Active Risk & Trust Signals List */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", marginBottom: 6 }}>
              Active Scoring Factors for this Transfer:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {liveEstimate.signals.map((sig, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 6,
                    backgroundColor:
                      sig.type === "risk"
                        ? "rgba(255, 59, 48, 0.08)"
                        : sig.type === "trust"
                        ? "rgba(52, 199, 89, 0.1)"
                        : "rgba(0, 0, 0, 0.04)",
                    color:
                      sig.type === "risk"
                        ? "var(--color-danger)"
                        : sig.type === "trust"
                        ? "var(--color-safe)"
                        : "var(--color-body-muted)",
                    border: `1px solid ${
                      sig.type === "risk"
                        ? "rgba(255, 59, 48, 0.2)"
                        : sig.type === "trust"
                        ? "rgba(52, 199, 89, 0.2)"
                        : "rgba(0, 0, 0, 0.08)"
                    }`,
                    fontWeight: 500,
                  }}
                >
                  {sig.text}
                </span>
              ))}
            </div>
          </div>

          {/* SafePay Voice Guard Preview Alert */}
          {(liveEstimate.level === "MEDIUM" || liveEstimate.level === "HIGH") && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                backgroundColor: "rgba(255, 255, 255, 0.75)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Volume2 size={16} color={liveEstimate.color} />
                <div>
                  <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>
                    Voice Readout Armed:{" "}
                  </span>
                  <span style={{ color: "var(--color-body-muted)" }}>
                    Audible voice security recap will announce on the review screen.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="button-pearl-capsule"
                onClick={() => {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    const amtStr = (parseFloat(amount) || 0).toLocaleString("en-IN");
                    const targetName = isCustomPayee ? (customName || "Custom Payee") : (selectedContact?.displayName || "Recipient");
                    const text =
                      liveEstimate.level === "HIGH"
                        ? `Security Alert: High Risk Transaction Detected. You are transferring a high-value amount of ${amtStr} rupees to ${targetName}. Mandatory cooling-off delay and OTP required.`
                        : `Notice: Medium Risk Transaction. You are authorizing a transfer of ${amtStr} rupees to ${targetName}. Please verify recipient details before confirming.`;
                    const u = new SpeechSynthesisUtterance(text);
                    u.lang = "en-IN";
                    u.rate = 0.95;
                    window.speechSynthesis.speak(u);
                  }
                }}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  color: liveEstimate.color,
                  borderColor: liveEstimate.color,
                  fontWeight: 600,
                }}
              >
                🔊 Test Voice Alert
              </button>
            </div>
          )}
        </div>

        {/* ── Collapsible Simulation Controls ── */}
        <div
          style={{
            marginBottom: 24,
            padding: "12px 16px",
            backgroundColor: "rgba(0,0,0,0.02)",
            border: "1px dashed var(--color-hairline)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setShowSimControls(!showSimControls)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SlidersHorizontal size={14} color="var(--color-body-muted)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink-muted-80)" }}>
                Additional Environmental Anomaly Vectors
              </span>
            </div>
            <span style={{ fontSize: 12, color: "var(--color-primary)" }}>
              {showSimControls ? "Hide" : "Show"}
            </span>
          </div>

          {showSimControls && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Device Fingerprint:</span>
                <select
                  value={simDevice}
                  onChange={(e) => setSimDevice(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-hairline)" }}
                >
                  <option value="KNOWN-DEVICE">Known Trusted Device (+0)</option>
                  <option value="NEW-DEVICE">Unseen New Device (+20 Risk)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Geolocation:</span>
                <select
                  value={simCity}
                  onChange={(e) => setSimCity(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-hairline)" }}
                >
                  <option value="Chennai">Chennai (Usual City, +0)</option>
                  <option value="Mumbai">Mumbai (Distant City, +20 Risk)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Time of Day:</span>
                <button
                  type="button"
                  className={simOddHour ? "button-primary" : "button-pearl-capsule"}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                  onClick={() => setSimOddHour(!simOddHour)}
                >
                  {simOddHour ? "Odd Hour: 02:30 AM (+10)" : "Normal Daytime (+0)"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Submit Button with dynamic badge ── */}
        <button
          type="submit"
          className="button-primary"
          style={{
            width: "100%",
            padding: "14px 24px",
            fontSize: 16,
            backgroundColor: liveEstimate.level === "HIGH" ? "var(--color-danger)" : liveEstimate.level === "MEDIUM" ? "#e68a00" : undefined,
          }}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Evaluating Adaptive Friction...
            </>
          ) : (
            <>
              Proceed to {liveEstimate.level} Risk Review
              <ArrowUpRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
