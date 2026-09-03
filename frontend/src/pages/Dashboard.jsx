import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ShieldCheck, Zap, ShieldAlert, ArrowRight } from "lucide-react";
import { getContacts } from "../api";
import ContactCard from "../components/ContactCard";

export default function Dashboard() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getContacts()
      .then(setContacts)
      .finally(() => setLoading(false));
  }, []);

  const filteredContacts = contacts.filter((c) =>
    c.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.upiId && c.upiId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      {/* ── Apple Style Hero Section ── */}
      <section style={{ textAlign: "center", padding: "32px 0 40px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <span className="apple-chip chip-trusted" style={{ fontSize: 13, padding: "4px 14px" }}>
            SafePay Security Architecture
          </span>
        </div>
        <h1 className="typography-hero" style={{ marginBottom: 12 }}>
          Adaptive Fraud Prevention.
        </h1>
        <p style={{ fontSize: 19, color: "var(--color-body-muted)", maxWidth: 620, margin: "0 auto 28px", lineHeight: 1.4 }}>
          Routine transfers stay one-tap. Unusual transfers trigger step-up verification, cooling-off delays, and OTP safeguards.
        </p>

        {/* ── Interactive Judge Demo Quick-Launch Bar ── */}
        <div
          style={{
            backgroundColor: "var(--color-canvas)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            margin: "0 auto 36px",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink-muted-48)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Judge Demo Scenarios
            </span>
            <div style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 600 }}>
              Test adaptive friction in 1 tap:
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="button-pearl-capsule"
              onClick={() => navigate("/send/ACC-1001?presetAmt=500")}
              title="Priya Sharma (Trusted, Verified) - Instant One-Tap"
            >
              <Zap size={14} color="var(--color-safe)" />
              <span>Low Risk (₹500)</span>
            </button>

            <button
              type="button"
              className="button-pearl-capsule"
              onClick={() => navigate("/send/ACC-1003?presetAmt=12000")}
              title="Anita Desai (Regular, Unverified) - Recap review required"
            >
              <ShieldCheck size={14} color="var(--color-caution)" />
              <span>Medium Risk (₹12k)</span>
            </button>

            <button
              type="button"
              className="button-pearl-capsule"
              style={{ borderColor: "rgba(255, 59, 48, 0.3)" }}
              onClick={() => navigate("/send/ACC-1005?presetAmt=65000")}
              title="Sneha Reddy (New, Unverified, High Amount) - 30s Delay + OTP"
            >
              <ShieldAlert size={14} color="var(--color-danger)" />
              <span style={{ color: "var(--color-danger)" }}>High Risk (₹65k)</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Search & Filter Controls ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <Search
            size={16}
            color="var(--color-body-muted)"
            style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            className="apple-input"
            style={{ borderRadius: "var(--radius-pill)", paddingLeft: 42, height: 42, fontSize: 14 }}
            placeholder="Search payees or UPI IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className="button-primary"
          style={{ padding: "9px 20px", fontSize: 14 }}
          onClick={() => navigate("/send")}
        >
          <Plus size={15} />
          New Payee
        </button>
      </div>

      {/* ── Contact List ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 84,
                backgroundColor: "var(--color-canvas)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-hairline)",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div
          className="store-utility-card"
          style={{ textAlign: "center", padding: "64px 24px" }}
        >
          <p style={{ fontSize: 17, color: "var(--color-body-muted)", marginBottom: 20 }}>
            {searchTerm ? "No payees found matching your search." : "No saved payees found."}
          </p>
          <button className="button-primary" onClick={() => navigate("/send")}>
            <Plus size={16} />
            Transfer to New Payee
          </button>
        </div>
      ) : (
        <div>
          {filteredContacts.map((contact) => (
            <ContactCard key={contact.accountId} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}
