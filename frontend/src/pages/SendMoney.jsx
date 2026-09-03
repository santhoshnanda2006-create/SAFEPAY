import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Check, SlidersHorizontal, Loader2, Sparkles } from "lucide-react";
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

  // New payee fields
  const [isNewPayee, setIsNewPayee] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUpi, setNewUpi] = useState("");

  // Demo context overrides
  const [showSimControls, setShowSimControls] = useState(false);
  const [simDevice, setSimDevice] = useState("KNOWN-DEVICE");
  const [simCity, setSimCity] = useState("Chennai");
  const [simOddHour, setSimOddHour] = useState(false);

  useEffect(() => {
    getContacts().then((data) => {
      setContacts(data);
      if (accountId) {
        const found = data.find((c) => c.accountId === accountId);
        if (found) setSelectedContact(found);
      }
      const presetAmt = searchParams.get("presetAmt");
      if (presetAmt) {
        setAmount(presetAmt);
      }
      setLoadingContacts(false);
    });
  }, [accountId, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    setLoading(true);
    try {
      const timestamp = simOddHour
        ? "2026-09-04T02:30:00.000Z"
        : new Date().toISOString();

      const body = {
        senderId: "SENDER-001",
        payeeAccountId: selectedContact?.accountId || `NEW-${Date.now()}`,
        payeeUpiId: selectedContact?.upiId || newUpi || null,
        payeeDisplayName: selectedContact?.displayName || newName,
        amount: amt,
        deviceId: simDevice === "NEW-DEVICE" ? "NEW-DEVICE-IPHONE17" : "DEVICE-001",
        location: {
          lat: simCity === "Mumbai" ? 19.0760 : 13.0827,
          lng: simCity === "Mumbai" ? 72.8777 : 80.2707,
          city: simCity,
        },
        timestamp,
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
    (selectedContact || (newName && newUpi)) && amount && parseFloat(amount) > 0;

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
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
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 className="typography-display" style={{ marginBottom: 6 }}>
          Transfer Funds
        </h1>
        <p style={{ fontSize: 15, color: "var(--color-body-muted)" }}>
          Evaluated in real-time by SafePay's adaptive risk engine
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Big Amount Input ── */}
        <div
          className="store-utility-card"
          style={{ textAlign: "center", padding: "36px 24px 28px", marginBottom: 20 }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Transfer Amount (INR)
          </span>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 16 }}>
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
              autoFocus
              style={{
                width: "100%",
                maxWidth: 320,
                border: "none",
                background: "transparent",
                outline: "none",
                color: "var(--color-ink)",
              }}
            />
          </div>

          {/* Quick preset chips */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {[500, 2500, 10000, 65000].map((val) => (
              <button
                key={val}
                type="button"
                className="button-pearl-capsule"
                style={{ fontSize: 13, padding: "5px 12px" }}
                onClick={() => setAmount(String(val))}
              >
                ₹{val.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        {/* ── Payee Selector Card ── */}
        <div className="store-utility-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
              Recipient Details
            </label>
            <button
              type="button"
              onClick={() => {
                setIsNewPayee(!isNewPayee);
                setSelectedContact(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {isNewPayee ? "← Choose from Contacts" : "+ Enter New Payee"}
            </button>
          </div>

          {!isNewPayee ? (
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
                      {c.displayName} ({c.trustLevel} · {c.upiId || c.accountId})
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedContact.displayName}</span>
                    <VerifiedBadge verified={selectedContact.isVerified} />
                    <TrustBadge level={selectedContact.trustLevel} />
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-body-muted)", fontFamily: "monospace" }}>
                    UPI: {selectedContact.upiId || selectedContact.accountId}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                className="apple-input"
                placeholder="Full Legal Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="apple-input"
                placeholder="UPI ID (e.g. name@okhdfcbank)"
                value={newUpi}
                onChange={(e) => setNewUpi(e.target.value)}
              />
              <div style={{ fontSize: 12, color: "var(--color-body-muted)", lineHeight: 1.4 }}>
                💡 First-time transfers to unknown payees automatically receive a <strong>+30 Risk Score</strong> baseline.
              </div>
            </div>
          )}
        </div>

        {/* ── Demo Pitcher Controls (Collapsible) ── */}
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
                Judge Simulation Controls (Simulate Anomaly Vectors)
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

        {/* ── Submit CTA ── */}
        <button
          type="submit"
          className="button-primary"
          style={{ width: "100%", padding: "14px 24px", fontSize: 16 }}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Running Adaptive Fraud Scoring...
            </>
          ) : (
            <>
              Evaluate & Continue
              <ArrowUpRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
