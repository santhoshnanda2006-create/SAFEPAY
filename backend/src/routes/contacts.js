const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/**
 * GET /api/contacts
 * Returns all contacts with computed trustLevel and isVerified fields.
 */
router.get('/', (req, res) => {
  const db = getDb();

  const contacts = db.prepare(`
    SELECT
      c.accountId,
      c.upiId,
      c.displayName,
      c.transferCount,
      c.lastTransferAt,
      CASE
        WHEN v.kycName IS NOT NULL THEN 1
        ELSE 0
      END AS isVerified
    FROM contacts c
    LEFT JOIN verified_names v ON c.accountId = v.accountId
    ORDER BY c.displayName
  `).all();

  const result = contacts.map(c => ({
    accountId: c.accountId,
    upiId: c.upiId,
    displayName: c.displayName,
    isVerified: Boolean(c.isVerified),
    lastTransferAt: c.lastTransferAt,
    transferCount: c.transferCount,
    trustLevel: c.transferCount >= 3 ? 'TRUSTED' : c.transferCount === 0 ? 'NEW' : 'REGULAR',
  }));

  res.json(result);
});

module.exports = router;
