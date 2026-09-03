# Fraud Detection Backend — Hackathon MVP

Rule-based fraud prevention layer for a money-transfer app. Evaluates transfers for risk signals, assigns a score, and gates execution behind step-up verification when needed.

## Quick Start

```bash
npm install
npm start        # → http://localhost:4000
```

The database is created and seeded automatically on first run — no manual setup needed.

To use a different port:
```bash
PORT=5000 npm start
```

---

## API Endpoints

### `GET /api/contacts`

Returns all known payee contacts with trust levels.

```bash
curl http://localhost:4000/api/contacts | jq
```

**Response:**
```json
[
  {
    "accountId": "ACC001",
    "upiId": "priya.sharma@upi",
    "displayName": "Priya Sharma",
    "isVerified": true,
    "lastTransferAt": "2026-08-28T14:30:00Z",
    "transferCount": 5,
    "trustLevel": "TRUSTED"
  }
]
```

---

### `POST /api/transfer/evaluate`

Evaluate a transfer for fraud risk before executing.

**LOW risk (trusted payee, normal amount):**
```bash
curl -X POST http://localhost:4000/api/transfer/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "SENDER01",
    "payeeAccountId": "ACC001",
    "payeeUpiId": "priya.sharma@upi",
    "payeeDisplayName": "Priya Sharma",
    "amount": 5000,
    "deviceId": "device-abc-123",
    "location": { "lat": 19.076, "lng": 72.877, "city": "Mumbai" },
    "timestamp": "2026-09-03T14:30:00Z"
  }'
```

**HIGH risk (new payee, large amount, new device, odd hour):**
```bash
curl -X POST http://localhost:4000/api/transfer/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "SENDER01",
    "payeeAccountId": "ACC004",
    "payeeUpiId": "vikram.patel@upi",
    "payeeDisplayName": "Vikram P",
    "amount": 75000,
    "deviceId": "device-UNKNOWN-999",
    "location": { "lat": 28.614, "lng": 77.209, "city": "Delhi" },
    "timestamp": "2026-09-03T02:15:00Z"
  }'
```

**Response:**
```json
{
  "evaluationId": "EVAL-A1B2C3D4",
  "riskScore": 85,
  "riskLevel": "HIGH",
  "isNewPayee": true,
  "payeeVerified": false,
  "payeeAccountAgeDays": 0,
  "requiredSteps": ["CONFIRM_RECAP", "DELAY_30S", "OTP"],
  "reasons": [
    "First transfer to this payee",
    "Amount exceeds ₹50,000",
    "New device detected",
    "Transfer from unusual location (Delhi, usual: Mumbai)",
    "Unusual time of day (2:15 am)"
  ]
}
```

---

### `POST /api/transfer/execute`

Execute a previously evaluated transfer. Must satisfy all required verification steps.

```bash
curl -X POST http://localhost:4000/api/transfer/execute \
  -H "Content-Type: application/json" \
  -d '{
    "evaluationId": "EVAL-A1B2C3D4",
    "verification": {
      "confirmedRecap": true,
      "otp": "123456"
    }
  }'
```

**Response:**
```json
{
  "status": "SUCCESS",
  "transactionId": "TX-E5F6G7H8",
  "timestamp": "2026-09-03T14:35:00Z"
}
```

> **Dev OTP:** `123456` — hardcoded for the demo.

---

### `GET /api/transfer/history`

Returns all transaction history, most recent first.

```bash
curl http://localhost:4000/api/transfer/history | jq
```

---

## Risk Scoring Rules

| Signal | Points | Description |
|--------|--------|-------------|
| New payee | +30 | Never transferred to this account before |
| Amount anomaly | +25 | > 3x sender's average, or > ₹50,000 |
| New device | +20 | Device ID not previously seen for sender |
| Unusual location | +20 | Different city or > 100km from usual |
| Late night | +10 | Transfer between 00:00–05:00 |
| Velocity | +25 | 3+ transfers in preceding 10 minutes |
| KYC verified | −15 | Display name matches KYC record |
| Trusted payee | −20 | 3+ prior successful transfers |

**Score → Risk Level:**
- `0–29` → **LOW** → no extra steps
- `30–59` → **MEDIUM** → recap confirmation
- `60–100` → **HIGH** → recap + 30s delay + OTP

---

## Seed Data

The database comes pre-loaded with:
- **5 contacts** (Priya, Rahul, Anita, Vikram, Meena) with varied trust levels
- **4 KYC records** (Vikram intentionally unverified)
- **4 prior transactions** from `SENDER01` to establish history
- **1 known device** (`device-abc-123`) for `SENDER01`

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** SQLite via `better-sqlite3` (synchronous, zero config)
- **No build step** — just `npm install` and `npm start`
