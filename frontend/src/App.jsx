import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import SendMoney from "./pages/SendMoney";
import RiskReview from "./pages/RiskReview";
import Result from "./pages/Result";
import History from "./pages/History";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="main-shell">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/send" element={<SendMoney />} />
          <Route path="/send/:accountId" element={<SendMoney />} />
          <Route path="/review" element={<RiskReview />} />
          <Route path="/result" element={<Result />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>

      {/* ── Apple-Style Quiet Footer ── */}
      <footer className="apple-footer">
        <div className="apple-footer-inner">
          <p className="apple-footer-text">
            1. Recipient Trust Evaluation compares recipient display names against registered KYC records via normalized fuzzy matching. Unknown account IDs receive a baseline first-time risk penalty (+30).
          </p>
          <p className="apple-footer-text">
            2. Adaptive Friction triggers stepped-up verification protocols only when composite anomaly scores meet or exceed threshold tiers: Low (0–29), Medium (30–59), High (60–100).
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-hairline)", paddingTop: 16, flexWrap: "wrap", gap: 12 }}>
            <span className="apple-footer-text">
              Copyright © 2026 SafePay Financial Inc. Built for 24-Hour Hackathon Demo.
            </span>
            <div style={{ display: "flex", gap: 16 }}>
              <span className="apple-footer-text" style={{ color: "var(--color-primary)", cursor: "pointer" }}>
                Privacy Policy
              </span>
              <span className="apple-footer-text" style={{ color: "var(--color-primary)", cursor: "pointer" }}>
                Terms of Use
              </span>
              <span className="apple-footer-text" style={{ color: "var(--color-primary)", cursor: "pointer" }}>
                Fraud Prevention Architecture
              </span>
            </div>
          </div>
        </div>
      </footer>
    </BrowserRouter>
  );
}
