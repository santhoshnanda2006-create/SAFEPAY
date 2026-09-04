/**
 * Rule-based risk scoring engine.
 * Every signal is individually scored and produces a human-readable reason.
 * Final score is clamped to [0, 100].
 */

const { getDb } = require('./db');

// ── Helpers ──────────────────────────────────────────────────

/** Levenshtein distance for fuzzy KYC name matching */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Haversine distance in km */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Rough city-center coordinates for distance fallback
const CITY_COORDS = {
  'mumbai':    { lat: 19.076,  lng: 72.8777 },
  'delhi':     { lat: 28.6139, lng: 77.209  },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'chennai':   { lat: 13.0827, lng: 80.2707 },
  'kolkata':   { lat: 22.5726, lng: 88.3639 },
  'hyderabad': { lat: 17.385,  lng: 78.4867 },
  'pune':      { lat: 18.5204, lng: 73.8567 },
  'jaipur':    { lat: 26.9124, lng: 75.7873 },
};

// ── Payee verification (simulated KYC) ──────────────────────

function verifyPayee(payeeAccountId, payeeDisplayName) {
  const db = getDb();
  const row = db.prepare('SELECT kycName FROM verified_names WHERE accountId = ?').get(payeeAccountId);
  if (!row) return false;

  const a = payeeDisplayName.toLowerCase().trim();
  const b = row.kycName.toLowerCase().trim();
  return levenshtein(a, b) <= 2;
}

// ── Core scoring ────────────────────────────────────────────

function evaluateRisk({
  senderId,
  payeeAccountId,
  payeeDisplayName,
  amount,
  deviceId,
  location,
  timestamp,
  isCustomPayee,
  customTrustLevel,
  customIsVerified,
}) {
  const db = getDb();
  let score = 0;
  const reasons = [];

  const numericAmt = Number(amount) || 0;

  // Payee lookup for metadata and display attributes (does not alter amount-based risk tier)
  const contactRow = payeeAccountId
    ? db.prepare('SELECT transferCount FROM contacts WHERE accountId = ?').get(payeeAccountId)
    : null;
  const isNewPayee = isCustomPayee ? (customTrustLevel === 'NEW') : (!contactRow || contactRow.transferCount === 0);
  const payeeVerified = isCustomPayee ? Boolean(customIsVerified) : verifyPayee(payeeAccountId, payeeDisplayName);
  const trustLevel = isCustomPayee ? (customTrustLevel || 'NEW') : (contactRow?.transferCount >= 3 ? 'TRUSTED' : (contactRow?.transferCount === 0 ? 'NEW' : 'REGULAR'));

  // ── 1. PRIMARY RISK LEVEL DETERMINED STRICTLY BY TRANSFER AMOUNT ──
  let riskLevel, requiredSteps;

  if (numericAmt >= 50000) {
    // HIGH RISK: Amount >= ₹50,000
    riskLevel = 'HIGH';
    requiredSteps = ['CONFIRM_RECAP', 'DELAY_30S', 'OTP'];
    score = Math.min(100, 65 + Math.round((numericAmt - 50000) / 2500));
    reasons.push(`High-value transfer: ₹${numericAmt.toLocaleString('en-IN')} exceeds the ₹50,000 security threshold`);
    if (numericAmt >= 100000) {
      reasons.push(`Critical amount threshold exceeded (≥ ₹1,00,000)`);
    }
  } else if (numericAmt >= 10000) {
    // MEDIUM RISK: Amount ₹10,000 – ₹49,999
    riskLevel = 'MEDIUM';
    requiredSteps = ['CONFIRM_RECAP'];
    score = 25 + Math.round(((numericAmt - 10000) / 40000) * 20);
    reasons.push(`Elevated transfer amount: ₹${numericAmt.toLocaleString('en-IN')} requires recipient recap review (threshold ₹10,000)`);
  } else {
    // LOW RISK: Amount < ₹10,000
    riskLevel = 'LOW';
    requiredSteps = [];
    score = Math.max(0, Math.round((numericAmt / 10000) * 15));
    // Clean routine transfer — no warning reasons needed
  }

  // ── 2. Contextual Anomaly Vectors (Environmental overrides if simulated) ──
  if (deviceId && (deviceId.includes('NEW') || deviceId.includes('IPHONE'))) {
    score = Math.min(100, score + 20);
    reasons.push('Unrecognized device fingerprint detected (+20)');
    if (riskLevel === 'MEDIUM') {
      riskLevel = 'HIGH';
      requiredSteps = ['CONFIRM_RECAP', 'DELAY_30S', 'OTP'];
    } else if (riskLevel === 'LOW' && score >= 25) {
      riskLevel = 'MEDIUM';
      requiredSteps = ['CONFIRM_RECAP'];
    }
  }

  if (location?.city && location.city.toLowerCase() !== 'chennai') {
    score = Math.min(100, score + 20);
    reasons.push(`Transfer from unusual location: ${location.city} (+20)`);
    if (riskLevel === 'MEDIUM') {
      riskLevel = 'HIGH';
      requiredSteps = ['CONFIRM_RECAP', 'DELAY_30S', 'OTP'];
    } else if (riskLevel === 'LOW' && score >= 25) {
      riskLevel = 'MEDIUM';
      requiredSteps = ['CONFIRM_RECAP'];
    }
  }

  const ts = new Date(timestamp);
  const hour = ts.getHours();
  if (hour >= 0 && hour < 5) {
    score = Math.min(100, score + 10);
    const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    reasons.push(`Unusual late-night transaction time: ${timeStr} (+10)`);
  }

  score = Math.max(0, Math.min(100, score));

  const payeeAccountAgeDays = contactRow ? 90 : (trustLevel === 'TRUSTED' ? 180 : (trustLevel === 'REGULAR' ? 45 : 0));

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

module.exports = { evaluateRisk, verifyPayee, levenshtein };
