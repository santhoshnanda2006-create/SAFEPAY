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

// ── Determine risk strictly by amount ──
function evaluateRisk(body) {
  const contact = MOCK_CONTACTS.find(
    (c) => c.accountId === body.payeeAccountId
  );

  let isNewPayee, payeeVerified, trustLevel;
  if (body.isCustomPayee) {
    trustLevel = body.customTrustLevel || "NEW";
    isNewPayee = trustLevel === "NEW";
    payeeVerified = Boolean(body.customIsVerified);
  } else {
    isNewPayee = !contact || contact.transferCount === 0;
    payeeVerified = contact ? contact.isVerified : false;
    trustLevel = contact?.trustLevel || (isNewPayee ? "NEW" : "REGULAR");
  }

  const payeeAccountAgeDays = contact ? 120 : (trustLevel === "TRUSTED" ? 180 : (trustLevel === "REGULAR" ? 45 : 0));

  let score = 0;
  const reasons = [];
  const amt = Number(body.amount) || 0;

  // ── Primary risk level determined strictly by transfer amount (not recipient) ──
  let riskLevel, requiredSteps;
  if (amt >= 50000) {
    riskLevel = "HIGH";
    requiredSteps = ["CONFIRM_RECAP", "DELAY_30S", "OTP"];
    score = Math.min(100, 65 + Math.round((amt - 50000) / 2500));
    reasons.push(`High-value transfer: ₹${amt.toLocaleString("en-IN")} exceeds ₹50,000 security threshold`);
    if (amt >= 100000) {
      reasons.push(`Critical amount threshold exceeded (≥ ₹1,00,000)`);
    }
  } else if (amt >= 10000) {
    riskLevel = "MEDIUM";
    requiredSteps = ["CONFIRM_RECAP"];
    score = 25 + Math.round(((amt - 10000) / 40000) * 20);
    reasons.push(`Elevated transfer amount: ₹${amt.toLocaleString("en-IN")} requires recipient recap review (threshold ₹10,000)`);
  } else {
    riskLevel = "LOW";
    requiredSteps = [];
    score = Math.max(0, Math.round((amt / 10000) * 15));
  }

  // Environmental vectors
  if (body.deviceId && body.deviceId.startsWith("NEW")) {
    score = Math.min(100, score + 20);
    reasons.push("Unrecognized device fingerprint detected (+20 Risk)");
    if (riskLevel === "MEDIUM") {
      riskLevel = "HIGH";
      requiredSteps = ["CONFIRM_RECAP", "DELAY_30S", "OTP"];
    } else if (riskLevel === "LOW" && score >= 25) {
      riskLevel = "MEDIUM";
      requiredSteps = ["CONFIRM_RECAP"];
    }
  }
  if (
    body.location &&
    body.location.city &&
    body.location.city.toLowerCase() !== "chennai"
  ) {
    score = Math.min(100, score + 20);
    reasons.push(`Unusual location: ${body.location.city} (+20 Risk)`);
    if (riskLevel === "MEDIUM") {
      riskLevel = "HIGH";
      requiredSteps = ["CONFIRM_RECAP", "DELAY_30S", "OTP"];
    } else if (riskLevel === "LOW" && score >= 25) {
      riskLevel = "MEDIUM";
      requiredSteps = ["CONFIRM_RECAP"];
    }
  }
  const hour = new Date(body.timestamp).getHours();
  if (hour >= 0 && hour < 5) {
    score = Math.min(100, score + 10);
    reasons.push("Unusual late-night transaction time (+10 Risk)");
  }
  score = Math.max(0, Math.min(100, score));

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
