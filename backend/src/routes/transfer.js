const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { evaluateRisk } = require('../scoring');

const router = express.Router();

/**
 * POST /api/transfer/evaluate
 * Evaluates a transfer for fraud risk. Persists the evaluation so /execute can look it up.
 */
router.post('/evaluate', (req, res) => {
  const {
    senderId,
    payeeAccountId,
    payeeUpiId,
    payeeDisplayName,
    amount,
    deviceId,
    location,
    timestamp,
    isCustomPayee,
    customTrustLevel,
    customIsVerified,
  } = req.body;

  // Basic validation
  if (!senderId || !payeeAccountId || !amount || !timestamp) {
    return res.status(400).json({
      error: 'Missing required fields: senderId, payeeAccountId, amount, timestamp',
    });
  }

  const evaluation = evaluateRisk({
    senderId,
    payeeAccountId,
    payeeDisplayName: payeeDisplayName || '',
    amount: Number(amount),
    deviceId: deviceId || null,
    location: location || {},
    timestamp,
    isCustomPayee,
    customTrustLevel,
    customIsVerified,
  });

  const evaluationId = `EVAL-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Persist evaluation
  const db = getDb();
  db.prepare(`
    INSERT INTO evaluations
      (evaluationId, senderId, payeeAccountId, payeeUpiId, payeeDisplayName,
       amount, deviceId, locationLat, locationLng, locationCity,
       timestamp, riskScore, riskLevel, isNewPayee, payeeVerified,
       payeeAccountAgeDays, requiredSteps, reasons, executed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    evaluationId, senderId, payeeAccountId, payeeUpiId || null, payeeDisplayName || null,
    Number(amount), deviceId || null,
    location?.lat || null, location?.lng || null, location?.city || null,
    timestamp,
    evaluation.riskScore, evaluation.riskLevel,
    evaluation.isNewPayee ? 1 : 0, evaluation.payeeVerified ? 1 : 0,
    evaluation.payeeAccountAgeDays,
    JSON.stringify(evaluation.requiredSteps), JSON.stringify(evaluation.reasons)
  );

  const response = {
    evaluationId,
    riskScore: evaluation.riskScore,
    riskLevel: evaluation.riskLevel,
    isNewPayee: evaluation.isNewPayee,
    payeeVerified: evaluation.payeeVerified,
    payeeAccountAgeDays: evaluation.payeeAccountAgeDays,
    requiredSteps: evaluation.requiredSteps,
    reasons: evaluation.reasons,
  };

  // Console log for live demo sanity-checking
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔍 RISK EVALUATION  │  ${evaluationId}`);
  console.log(`   Sender: ${senderId}  →  Payee: ${payeeAccountId} (${payeeDisplayName})`);
  console.log(`   Amount: ₹${Number(amount).toLocaleString('en-IN')}`);
  console.log(`   Score:  ${evaluation.riskScore}/100  │  Level: ${evaluation.riskLevel}`);
  if (evaluation.reasons.length > 0) {
    console.log('   Reasons:');
    evaluation.reasons.forEach(r => console.log(`     • ${r}`));
  } else {
    console.log('   Reasons: (none — clean transfer)');
  }
  console.log(`   Steps:  ${evaluation.requiredSteps.length > 0 ? evaluation.requiredSteps.join(', ') : '(none)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  res.json(response);
});

/**
 * POST /api/transfer/execute
 * Executes a previously evaluated transfer, checking required verification steps.
 */
router.post('/execute', (req, res) => {
  const { evaluationId, verification } = req.body;

  if (!evaluationId) {
    return res.status(400).json({ error: 'Missing evaluationId' });
  }

  const db = getDb();
  const evalRow = db.prepare('SELECT * FROM evaluations WHERE evaluationId = ?').get(evaluationId);

  if (!evalRow) {
    return res.status(404).json({ error: 'Evaluation not found' });
  }

  if (evalRow.executed) {
    return res.status(409).json({ error: 'Evaluation already executed' });
  }

  const requiredSteps = JSON.parse(evalRow.requiredSteps);
  const verif = verification || {};

  // Validate required steps
  if (requiredSteps.includes('CONFIRM_RECAP') && verif.confirmedRecap !== true) {
    return res.json({
      status: 'BLOCKED',
      transactionId: null,
      timestamp: new Date().toISOString(),
      reason: 'Recap confirmation required but not provided',
    });
  }

  if (requiredSteps.includes('OTP') && verif.otp !== '123456') {
    return res.json({
      status: 'BLOCKED',
      transactionId: null,
      timestamp: new Date().toISOString(),
      reason: 'Invalid OTP',
    });
  }

  // Execute the transfer
  const transactionId = `TX-${uuidv4().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  const executeTx = db.transaction(() => {
    // Record transaction
    db.prepare(`
      INSERT INTO transactions (transactionId, evaluationId, senderId, payeeAccountId, payeeDisplayName, amount, status, riskLevel, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?)
    `).run(transactionId, evaluationId, evalRow.senderId, evalRow.payeeAccountId, evalRow.payeeDisplayName, evalRow.amount, evalRow.riskLevel, now);

    // Mark evaluation as executed
    db.prepare('UPDATE evaluations SET executed = 1 WHERE evaluationId = ?').run(evaluationId);

    // Increment payee's transferCount and update lastTransferAt
    db.prepare(`
      UPDATE contacts SET transferCount = transferCount + 1, lastTransferAt = ? WHERE accountId = ?
    `).run(now, evalRow.payeeAccountId);

    // Record device if new
    if (evalRow.deviceId) {
      db.prepare('INSERT OR IGNORE INTO devices (senderId, deviceId) VALUES (?, ?)').run(evalRow.senderId, evalRow.deviceId);
    }
  });

  executeTx();

  console.log(`✅ TRANSFER EXECUTED  │  ${transactionId}  │  ₹${evalRow.amount.toLocaleString('en-IN')} → ${evalRow.payeeDisplayName}`);

  res.json({
    status: 'SUCCESS',
    transactionId,
    timestamp: now,
  });
});

/**
 * GET /api/transfer/history
 * Returns transaction history, most recent first.
 */
router.get('/history', (req, res) => {
  const db = getDb();

  const history = db.prepare(`
    SELECT transactionId, payeeDisplayName, amount, status, riskLevel, timestamp
    FROM transactions
    ORDER BY timestamp DESC
  `).all();

  res.json(history);
});

module.exports = router;
