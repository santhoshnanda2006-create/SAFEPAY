// ─── Mock Data & Handlers ─────────────────────────────────────────
// Simulates the backend API so the frontend can run standalone.
// Replace with real API calls by switching USE_MOCK in api.js.

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Seed Contacts ──
export const MOCK_CONTACTS = [
  {
    accountId: "ACC-1001",
    upiId: "priya.sharma@upi",
    displayName: "Priya Sharma",
    isVerified: true,
    lastTransferAt: "2026-08-28T14:30:00Z",
    transferCount: 7,
    trustLevel: "TRUSTED",
  },
  {
    accountId: "ACC-1002",
    upiId: "rahul.verma@upi",
    displayName: "Rahul Verma",
    isVerified: true,
    lastTransferAt: "2026-09-01T10:15:00Z",
    transferCount: 3,
    trustLevel: "TRUSTED",
  },
  {
    accountId: "ACC-1003",
    upiId: "anita.desai@upi",
    displayName: "Anita Desai",
    isVerified: false,
    lastTransferAt: "2026-08-15T08:00:00Z",
    transferCount: 1,
    trustLevel: "REGULAR",
  },
  {
    accountId: "ACC-1004",
    upiId: "vikram.patel@upi",
    displayName: "Vikram Patel",
    isVerified: true,
    lastTransferAt: null,
    transferCount: 0,
    trustLevel: "NEW",
  },
  {
    accountId: "ACC-1005",
    upiId: "sneha.reddy@upi",
    displayName: "Sneha Reddy",
    isVerified: false,
    lastTransferAt: null,
    transferCount: 0,
    trustLevel: "NEW",
  },
];

// ── Seed History ──
let mockHistory = [
  {
    transactionId: "TXN-8001",
    payeeDisplayName: "Priya Sharma",
    amount: 2500,
    status: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-28T14:30:00Z",
  },
  {
    transactionId: "TXN-8002",
    payeeDisplayName: "Rahul Verma",
    amount: 15000,
    status: "SUCCESS",
    riskLevel: "MEDIUM",
    timestamp: "2026-09-01T10:15:00Z",
  },
  {
    transactionId: "TXN-8003",
    payeeDisplayName: "Priya Sharma",
    amount: 1000,
    status: "SUCCESS",
    riskLevel: "LOW",
    timestamp: "2026-08-25T09:00:00Z",
  },
];

// ── Stored evaluations ──
const evaluations = {};
let evalCounter = 9000;
let txnCounter = 9000;

// ── Determine risk for demo purposes ──
function evaluateRisk(body) {
  const contact = MOCK_CONTACTS.find(
    (c) => c.accountId === body.payeeAccountId
  );
  const isNewPayee = !contact || contact.transferCount === 0;
  const payeeVerified = contact ? contact.isVerified : false;
  const payeeAccountAgeDays = contact ? 120 + Math.floor(Math.random() * 200) : null;

  let score = 0;
  const reasons = [];

  if (isNewPayee) {
    score += 30;
    reasons.push("First transfer to this payee");
  }
  if (body.amount > 50000) {
    score += 25;
    reasons.push(
      `Amount ₹${body.amount.toLocaleString("en-IN")} exceeds ₹50,000 threshold`
    );
  } else if (body.amount > 7500) {
    // simulate 3x average
    score += 25;
    reasons.push(
      `Amount is significantly higher than your usual transfer`
    );
  }
  if (body.deviceId && body.deviceId.startsWith("NEW")) {
    score += 20;
    reasons.push("New device detected");
  }
  if (
    body.location &&
    body.location.city &&
    body.location.city.toLowerCase() !== "chennai"
  ) {
    score += 20;
    reasons.push(`Unusual location: ${body.location.city}`);
  }
  const hour = new Date(body.timestamp).getHours();
  if (hour >= 0 && hour < 5) {
    score += 10;
    reasons.push(
      `Unusual time of day (${hour}:${String(new Date(body.timestamp).getMinutes()).padStart(2, "0")} AM)`
    );
  }
  if (payeeVerified) {
    score -= 15;
    // don't push a "reason" for a deduction
  }
  if (contact && contact.trustLevel === "TRUSTED") {
    score -= 20;
  }
  score = Math.max(0, Math.min(100, score));

  let riskLevel, requiredSteps;
  if (score < 30) {
    riskLevel = "LOW";
    requiredSteps = [];
  } else if (score < 60) {
    riskLevel = "MEDIUM";
    requiredSteps = ["CONFIRM_RECAP"];
  } else {
    riskLevel = "HIGH";
    requiredSteps = ["CONFIRM_RECAP", "DELAY_30S", "OTP"];
  }

  return {
    riskScore: score,
    riskLevel,
    isNewPayee,
    payeeVerified,
    payeeAccountAgeDays,
    requiredSteps,
    reasons,
  };
}

// ── Mock API Handlers ──

export async function mockGetContacts() {
  await delay(400);
  return [...MOCK_CONTACTS];
}

export async function mockEvaluateTransfer(body) {
  await delay(600);
  const result = evaluateRisk(body);
  const evaluationId = `EVAL-${++evalCounter}`;
  const evaluation = { ...result, evaluationId, body };
  evaluations[evaluationId] = evaluation;
  return {
    evaluationId,
    ...result,
  };
}

export async function mockExecuteTransfer(body) {
  await delay(500);
  const evaluation = evaluations[body.evaluationId];
  if (!evaluation) {
    return { status: "FAILED", transactionId: null, timestamp: new Date().toISOString() };
  }

  const { requiredSteps } = evaluation;
  if (requiredSteps.includes("OTP") && body.verification?.otp !== "123456") {
    return { status: "BLOCKED", transactionId: null, timestamp: new Date().toISOString() };
  }
  if (
    requiredSteps.includes("CONFIRM_RECAP") &&
    !body.verification?.confirmedRecap
  ) {
    return { status: "BLOCKED", transactionId: null, timestamp: new Date().toISOString() };
  }

  const txn = {
    transactionId: `TXN-${++txnCounter}`,
    payeeDisplayName: evaluation.body.payeeDisplayName,
    amount: evaluation.body.amount,
    status: "SUCCESS",
    riskLevel: evaluation.riskLevel,
    timestamp: new Date().toISOString(),
  };
  mockHistory.unshift(txn);
  return { status: "SUCCESS", transactionId: txn.transactionId, timestamp: txn.timestamp };
}

export async function mockGetHistory() {
  await delay(300);
  return [...mockHistory];
}
