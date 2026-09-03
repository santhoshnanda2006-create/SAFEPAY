# SafePay — Fraud Prevention Frontend

A React + Vite + TailwindCSS prototype for a money-transfer fraud-prevention demo built for a 24-hour hackathon.

## 🚀 Quick Start

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173** by default.

## 📁 Project Structure

```
src/
├── api.js              # Centralized API calls (mock toggle)
├── mock.js             # Local mock data & handlers
├── index.css           # Design system & global styles
├── App.jsx             # Router & layout
├── main.jsx            # Entry point
├── components/
│   ├── Navbar.jsx      # Top navigation
│   ├── ContactCard.jsx # Payee card with badges
│   ├── TrustBadge.jsx  # TRUSTED/REGULAR/NEW pill
│   ├── VerifiedBadge.jsx # KYC verified checkmark
│   ├── RiskBanner.jsx  # Risk warning + reasons
│   ├── CountdownButton.jsx # 30s countdown for HIGH risk
│   └── OtpInput.jsx    # 6-digit OTP input
└── pages/
    ├── Dashboard.jsx   # Contact list
    ├── SendMoney.jsx   # Amount + payee form
    ├── RiskReview.jsx  # LOW/MEDIUM/HIGH risk flows
    ├── Result.jsx      # Success/Failed/Blocked
    └── History.jsx     # Transaction history
```

## 🎯 Key Features

### Risk-Based Adaptive Friction
- **LOW Risk** → One-tap confirm, instant send
- **MEDIUM Risk** → Recap card with reasons, manual confirm
- **HIGH Risk** → Warning banner, 30-second countdown, OTP verification

### Trust Signals
- **"New" badge** on first-time payees (transferCount = 0)
- **Verified checkmark** for KYC-confirmed names
- **Trust level pills** (TRUSTED / REGULAR / NEW)

### Risk Reasons
Every flagged transfer shows plain-English explanations:
- "First transfer to this payee"
- "Amount exceeds ₹50,000 threshold"
- "New device detected"
- "Unusual location"
- "Unusual time of day"

## 🔌 Backend Integration

The app reads `VITE_API_BASE_URL` from `.env` (defaults to `http://localhost:4000`).

To switch from mocks to the real backend:
1. Set `VITE_API_BASE_URL` in `.env` to your backend URL
2. In `src/api.js`, change `USE_MOCK = true` to `USE_MOCK = false`
3. That's it — all API calls are centralized in one file

## 🧪 Demo Tips

- Use the "Send" button next to any contact to start a transfer
- **LOW risk**: Send ₹500 to Priya Sharma (trusted, verified)
- **MEDIUM risk**: Send ₹10,000 to Anita Desai (regular, unverified)
- **HIGH risk**: Send ₹60,000 to Sneha Reddy (new, unverified)
- **OTP for HIGH risk**: Enter `123456` (dev OTP)
