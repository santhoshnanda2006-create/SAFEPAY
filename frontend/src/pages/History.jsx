import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Clock, Plus, ShieldCheck } from "lucide-react";
import { getTransferHistory } from "../api";
import { RiskBadge } from "../components/RiskBanner";

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getTransferHistory()
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 className="typography-display" style={{ marginBottom: 4 }}>
            Transaction Audit Trail
          </h1>
          <p style={{ fontSize: 15, color: "var(--color-body-muted)" }}>
            Ledger of evaluated transfers and automated security decisions
          </p>
        </div>

        <button
          className="button-primary"
          style={{ padding: "8px 18px", fontSize: 13 }}
          onClick={() => navigate("/send")}
        >
          <Plus size={14} />
          New Transfer
        </button>
      </div>

      {/* ── Transaction Cards ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 76,
                backgroundColor: "var(--color-canvas)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-hairline)",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div
          className="store-utility-card"
          style={{ textAlign: "center", padding: "64px 24px" }}
        >
          <Clock size={36} color="var(--color-body-muted)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 17, color: "var(--color-body-muted)", marginBottom: 20 }}>
            No recorded transactions yet.
          </p>
          <button className="button-primary" onClick={() => navigate("/send")}>
            Initiate First Transfer
          </button>
        </div>
      ) : (
        <div>
          {transactions.map((txn) => {
            const isSuccess = txn.status === "SUCCESS";
            return (
              <div
                key={txn.transactionId}
                className="store-utility-card"
                style={{
                  marginBottom: 12,
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Status Indicator Circle */}
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      backgroundColor: isSuccess ? "var(--color-safe-tint)" : "var(--color-danger-tint)",
                      border: `1px solid ${isSuccess ? "rgba(52,199,89,0.3)" : "rgba(255,59,48,0.3)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSuccess ? "var(--color-safe)" : "var(--color-danger)",
                      flexShrink: 0,
                    }}
                  >
                    <ArrowUpRight size={18} />
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 16, color: "var(--color-ink)" }}>
                        {txn.payeeDisplayName}
                      </span>
                      <span
                        className={`apple-chip ${isSuccess ? "chip-risk-low" : "chip-risk-high"}`}
                        style={{ fontSize: 11, padding: "2px 8px" }}
                      >
                        {txn.status}
                      </span>
                      <RiskBadge level={txn.riskLevel} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-body-muted)" }}>
                      <span style={{ fontFamily: "monospace" }}>{txn.transactionId}</span>
                      <span>•</span>
                      <span>
                        {new Date(txn.timestamp).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
                    ₹{txn.amount.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-ink-muted-48)" }}>
                    Settled INR
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
