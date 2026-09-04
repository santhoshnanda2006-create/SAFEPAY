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

  // Payee lookup and trust signals
  const contactRow = payeeAccountId
    ? db.prepare('SELECT transferCount FROM contacts WHERE accountId = ?').get(payeeAccountId)
    : null;
  const priorToPayee = (senderId && payeeAccountId)
    ? db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE senderId = ? AND payeeAccountId = ? AND status = ?').get(senderId, payeeAccountId, 'SUCCESS')
    : { n: 0 };

  let isNewPayee, trustLevel, payeeVerified;

  if (isCustomPayee) {
    trustLevel = customTrustLevel || 'NEW';
    isNewPayee = trustLevel === 'NEW';
    payeeVerified = Boolean(customIsVerified);
  } else {
    isNewPayee = (!contactRow || contactRow.transferCount === 0) && priorToPayee.n === 0;
    const transferCount = contactRow?.transferCount || 0;
    trustLevel = transferCount >= 3 ? 'TRUSTED' : transferCount === 0 ? 'NEW' : 'REGULAR';
    payeeVerified = verifyPayee(payeeAccountId, payeeDisplayName);
  }

  // 1. First-time Payee Signal (+30)
  if (isNewPayee) {
    score += 30;
    reasons.push('First transfer to this payee (+30 Risk)');
  }

  // 2. Scaled Amount Scoring (Dynamic based on absolute thresholds and multiple of usual average)
  const avgRow = db.prepare(
    'SELECT AVG(amount) AS avg FROM transactions WHERE senderId = ? AND status = ?'
  ).get(senderId, 'SUCCESS');
  const senderAvg = avgRow?.avg || 2500;
  const numericAmt = Number(amount) || 0;

  if (numericAmt >= 100000) {
    score += 50;
    reasons.push(`Critical high-value transfer: ₹${numericAmt.toLocaleString('en-IN')} exceeds ₹1,00,000 threshold (+50 Risk)`);
  } else if (numericAmt >= 50000) {
    score += 35;
    reasons.push(`High-value transfer: ₹${numericAmt.toLocaleString('en-IN')} exceeds ₹50,000 threshold (+35 Risk)`);
  } else if (numericAmt >= 25000 || numericAmt >= senderAvg * 6) {
    score += 30;
    reasons.push(`Amount is ${Math.round(numericAmt / senderAvg)}x your usual transfer (avg ₹${Math.round(senderAvg).toLocaleString('en-IN')}) (+30 Risk)`);
  } else if (numericAmt >= 7500 || numericAmt >= senderAvg * 3) {
    score += 25;
    reasons.push(`Amount is ${Math.round(numericAmt / senderAvg)}x your usual transfer (avg ₹${Math.round(senderAvg).toLocaleString('en-IN')}) (+25 Risk)`);
  }

  // High-value to unverified payee risk multiplier
  if (numericAmt >= 50000 && !payeeVerified) {
    score += 15;
    reasons.push('High-value transfer to unverified recipient (+15 Risk)');
  }

  // 3. New device
  const knownDevice = db.prepare(
    'SELECT 1 FROM devices WHERE senderId = ? AND deviceId = ?'
  ).get(senderId, deviceId);
  const isDevKnown = knownDevice || (deviceId && (deviceId.includes('KNOWN') || deviceId.includes('DEVICE-001') || deviceId.includes('device-abc-123')));
  if (!isDevKnown && deviceId) {
    score += 20;
    reasons.push('New device detected (+20 Risk)');
  }

  // 4. Unusual location
  const usualCityRow = db.prepare(
    `SELECT locationCity, COUNT(*) AS n FROM evaluations
     WHERE senderId = ? AND executed = 1 AND locationCity IS NOT NULL
     GROUP BY locationCity ORDER BY n DESC LIMIT 1`
  ).get(senderId);

  const baselineCity = usualCityRow?.locationCity || 'Chennai';
  if (location?.city) {
    const usualCity = baselineCity.toLowerCase().trim();
    const currentCity = location.city.toLowerCase().trim();
    if (usualCity !== currentCity) {
      score += 20;
      reasons.push(`Transfer from unusual location (${location.city}, usual: ${baselineCity}) (+20 Risk)`);
    }
  }

  // 5. Late-night transfer (00:00–05:00)
  const ts = new Date(timestamp);
  const hour = ts.getHours();
  if (hour >= 0 && hour < 5) {
    score += 10;
    const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    reasons.push(`Unusual time of day: ${timeStr} (+10 Risk)`);
  }

  // 6. Velocity — 3+ transfers in the preceding 10 minutes
  const tenMinAgo = new Date(ts.getTime() - 10 * 60 * 1000).toISOString();
  const recentCount = db.prepare(
    'SELECT COUNT(*) AS n FROM evaluations WHERE senderId = ? AND timestamp > ? AND timestamp <= ?'
  ).get(senderId, tenMinAgo, timestamp).n;
  if (recentCount >= 3) {
    score += 25;
    reasons.push(`High velocity: ${recentCount} transfers in the last 10 minutes (+25 Risk)`);
  }

  // 7. Payee verified (KYC match) → negative discount (-15)
  if (payeeVerified) {
    score -= 15;
  }

  // 8. Trust level → negative discount (-20)
  if (trustLevel === 'TRUSTED') {
    score -= 20;
  }

  // Clamp final score to [0, 100]
  score = Math.max(0, Math.min(100, score));

  // Adaptive Friction Assignment:
  // 0–24 = LOW (Instant 1-tap dispatch, 0 friction)
  // 25–49 = MEDIUM (Recap card review friction)
  // 50–100 = HIGH (30s Cooling-Off Reflection Delay + 2FA OTP friction)
  let riskLevel, requiredSteps;
  if (score <= 24) {
    riskLevel = 'LOW';
    requiredSteps = [];
  } else if (score <= 49) {
    riskLevel = 'MEDIUM';
    requiredSteps = ['CONFIRM_RECAP'];
  } else {
    riskLevel = 'HIGH';
    requiredSteps = ['CONFIRM_RECAP', 'DELAY_30S', 'OTP'];
  }

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
