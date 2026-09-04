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

function evaluateRisk({ senderId, payeeAccountId, payeeDisplayName, amount, deviceId, location, timestamp }) {
  const db = getDb();
  let score = 0;
  const reasons = [];

  // 1. isNewPayee — never transferred to this accountId before OR contact is new
  const contactRow = db.prepare('SELECT transferCount FROM contacts WHERE accountId = ?').get(payeeAccountId);
  const priorToPayee = db.prepare(
    'SELECT COUNT(*) AS n FROM transactions WHERE senderId = ? AND payeeAccountId = ? AND status = ?'
  ).get(senderId, payeeAccountId, 'SUCCESS');
  const isNewPayee = (!contactRow || contactRow.transferCount === 0) && priorToPayee.n === 0;
  if (isNewPayee) {
    score += 30;
    reasons.push('First transfer to this payee');
  }

  // 2. Amount anomaly — > 3x sender's average OR > ₹50,000
  const avgRow = db.prepare(
    'SELECT AVG(amount) AS avg FROM transactions WHERE senderId = ? AND status = ?'
  ).get(senderId, 'SUCCESS');
  const senderAvg = avgRow?.avg || 2500;
  const amountThreshold = senderAvg * 3;
  if (amount > 50000 || amount > amountThreshold) {
    score += 25;
    if (amount > 50000) {
      reasons.push(`Amount ₹${amount.toLocaleString('en-IN')} exceeds ₹50,000 threshold`);
    } else {
      reasons.push(`Amount is ${Math.round(amount / senderAvg)}x your usual transfer (avg ₹${Math.round(senderAvg).toLocaleString('en-IN')})`);
    }
  }

  // 3. New device
  const knownDevice = db.prepare(
    'SELECT 1 FROM devices WHERE senderId = ? AND deviceId = ?'
  ).get(senderId, deviceId);
  if (!knownDevice && deviceId) {
    score += 20;
    reasons.push('New device detected');
  }

  // 4. Unusual location
  const usualCityRow = db.prepare(
    `SELECT locationCity, COUNT(*) AS n FROM evaluations
     WHERE senderId = ? AND executed = 1 AND locationCity IS NOT NULL
     GROUP BY locationCity ORDER BY n DESC LIMIT 1`
  ).get(senderId);

  if (location?.city && usualCityRow?.locationCity) {
    const usualCity = usualCityRow.locationCity.toLowerCase().trim();
    const currentCity = location.city.toLowerCase().trim();
    if (usualCity !== currentCity) {
      // Try distance-based check if coords are available
      let flagged = true;
      if (location.lat && location.lng) {
        const usualCoords = CITY_COORDS[usualCity];
        if (usualCoords) {
          const dist = haversineKm(usualCoords.lat, usualCoords.lng, location.lat, location.lng);
          flagged = dist > 100;
        }
      }
      if (flagged) {
        score += 20;
        reasons.push(`Transfer from unusual location (${location.city}, usual: ${usualCityRow.locationCity})`);
      }
    }
  }

  // 5. Late-night transfer (00:00–05:00)
  const ts = new Date(timestamp);
  const hour = ts.getHours();
  if (hour >= 0 && hour < 5) {
    score += 10;
    const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    reasons.push(`Unusual time of day (${timeStr})`);
  }

  // 6. Velocity — 3+ transfers in the preceding 10 minutes
  const tenMinAgo = new Date(ts.getTime() - 10 * 60 * 1000).toISOString();
  const recentCount = db.prepare(
    'SELECT COUNT(*) AS n FROM evaluations WHERE senderId = ? AND timestamp > ? AND timestamp <= ?'
  ).get(senderId, tenMinAgo, timestamp).n;
  if (recentCount >= 3) {
    score += 25;
    reasons.push(`${recentCount} transfers in the last 10 minutes`);
  }

  // 7. Payee verified (KYC match) → negative signal
  const payeeVerified = verifyPayee(payeeAccountId, payeeDisplayName);
  if (payeeVerified) {
    score -= 15;
    // Not a "reason" shown to user — it's a trust signal, but we track it
  }

  // 8. Trust level → negative signal
  const transferCount = contactRow?.transferCount || 0;
  const trustLevel = transferCount >= 3 ? 'TRUSTED' : transferCount === 0 ? 'NEW' : 'REGULAR';
  if (trustLevel === 'TRUSTED') {
    score -= 20;
    // Trust discount — not surfaced as a risk "reason"
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Risk level & required steps:
  // 0–24 = LOW (Instant 1-tap dispatch)
  // 25–49 = MEDIUM (Recap review required)
  // 50–100 = HIGH (30s Reflection Delay + 2FA OTP)
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

  // Payee account age (days since first seen — simplified)
  const payeeAccountAgeDays = contactRow ? 90 : 0; // fixture: assume ~90 days for seeded contacts

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
