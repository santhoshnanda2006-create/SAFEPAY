/**
 * Database module using sql.js (pure JS/WASM SQLite — no native compilation needed).
 *
 * Exposes a better-sqlite3-compatible API via a thin wrapper so the rest of the
 * codebase (routes, scoring) can use db.prepare().get/all/run without changes.
 */

const initSqlJs = require('sql.js');

let compatDb = null;

// ── Compatibility wrapper ───────────────────────────────────
// Wraps the sql.js database to mimic better-sqlite3's synchronous API.

function createCompatDb(rawDb) {
  return {
    /** Execute raw SQL (multiple statements OK). */
    exec(sql) {
      rawDb.run(sql);
    },

    /** PRAGMA helper — best-effort, ignores unsupported pragmas. */
    pragma(str) {
      try { rawDb.run(`PRAGMA ${str}`); } catch (_) { /* ignore */ }
    },

    /**
     * Prepare a statement and return get/all/run helpers.
     * Each call creates a fresh statement (matches better-sqlite3 behaviour
     * where you can chain .prepare().get() without worrying about state).
     */
    prepare(sql) {
      return {
        /** Return the first matching row as a plain object, or undefined. */
        get(...params) {
          const stmt = rawDb.prepare(sql);
          try {
            if (params.length > 0) stmt.bind(params);
            return stmt.step() ? stmt.getAsObject() : undefined;
          } finally {
            stmt.free();
          }
        },

        /** Return all matching rows as an array of plain objects. */
        all(...params) {
          const stmt = rawDb.prepare(sql);
          try {
            if (params.length > 0) stmt.bind(params);
            const rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            return rows;
          } finally {
            stmt.free();
          }
        },

        /** Execute a write statement. Returns { changes }. */
        run(...params) {
          rawDb.run(sql, params);
          return { changes: rawDb.getRowsModified() };
        },
      };
    },

    /** Wrap a function in a BEGIN/COMMIT transaction (with ROLLBACK on error). */
    transaction(fn) {
      return (...args) => {
        rawDb.run('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          rawDb.run('COMMIT');
          return result;
        } catch (err) {
          rawDb.run('ROLLBACK');
          throw err;
        }
      };
    },
  };
}

// ── Public API ──────────────────────────────────────────────

/** Async one-time init — must be called (and awaited) before getDb(). */
async function initDb() {
  if (compatDb) return compatDb;

  const SQL = await initSqlJs();
  const rawDb = new SQL.Database(); // in-memory — re-seeds each launch (perfect for demo)

  compatDb = createCompatDb(rawDb);
  compatDb.pragma('foreign_keys = ON');
  initSchema();
  seedIfEmpty();

  return compatDb;
}

/** Synchronous getter — safe to call from any route after initDb() resolves. */
function getDb() {
  if (!compatDb) throw new Error('Database not initialised — call initDb() first');
  return compatDb;
}

// ── Schema ──────────────────────────────────────────────────

function initSchema() {
  const db = compatDb;

  // sql.js exec() handles multiple statements
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      accountId    TEXT PRIMARY KEY,
      upiId        TEXT NOT NULL,
      displayName  TEXT NOT NULL,
      transferCount INTEGER DEFAULT 0,
      lastTransferAt TEXT,
      usualCity    TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS verified_names (
      accountId TEXT PRIMARY KEY,
      kycName   TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      senderId  TEXT NOT NULL,
      deviceId  TEXT NOT NULL,
      UNIQUE(senderId, deviceId)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      evaluationId   TEXT PRIMARY KEY,
      senderId       TEXT NOT NULL,
      payeeAccountId TEXT NOT NULL,
      payeeUpiId     TEXT,
      payeeDisplayName TEXT,
      amount         REAL NOT NULL,
      deviceId       TEXT,
      locationLat    REAL,
      locationLng    REAL,
      locationCity   TEXT,
      timestamp      TEXT NOT NULL,
      riskScore      INTEGER NOT NULL,
      riskLevel      TEXT NOT NULL,
      isNewPayee     INTEGER NOT NULL,
      payeeVerified  INTEGER NOT NULL,
      payeeAccountAgeDays INTEGER DEFAULT 0,
      requiredSteps  TEXT NOT NULL,
      reasons        TEXT NOT NULL,
      executed       INTEGER DEFAULT 0
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      transactionId    TEXT PRIMARY KEY,
      evaluationId     TEXT NOT NULL,
      senderId         TEXT NOT NULL,
      payeeAccountId   TEXT NOT NULL,
      payeeDisplayName TEXT,
      amount           REAL NOT NULL,
      status           TEXT NOT NULL,
      riskLevel        TEXT NOT NULL,
      timestamp        TEXT NOT NULL
    )
  `);
}

// ── Seed data ───────────────────────────────────────────────

function seedIfEmpty() {
  const db = compatDb;
  const count = db.prepare('SELECT COUNT(*) AS n FROM contacts').get().n;
  if (count > 0) return;

  console.log('🌱 Seeding database with fixture data...');

  // ── Contacts ──────────────────────────────────────────────
  const insertContact = db.prepare(`
    INSERT INTO contacts (accountId, upiId, displayName, transferCount, lastTransferAt, usualCity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const contacts = [
    ['ACC-1001', 'priya.sharma@upi', 'Priya Sharma',  7, '2026-08-28T14:30:00Z', 'Chennai'],
    ['ACC-1002', 'rahul.verma@upi',  'Rahul Verma',   3, '2026-09-01T10:15:00Z', 'Chennai'],
    ['ACC-1003', 'anita.desai@upi',  'Anita Desai',   1, '2026-08-15T08:00:00Z', 'Chennai'],
    ['ACC-1004', 'vikram.patel@upi', 'Vikram Patel',  0, null,                    'Chennai'],
    ['ACC-1005', 'sneha.reddy@upi',  'Sneha Reddy',   0, null,                    null],
  ];
  const insertMany = db.transaction(() => {
    for (const c of contacts) insertContact.run(...c);
  });
  insertMany();

  // ── Verified KYC names ────────────────────────────────────
  const insertKyc = db.prepare('INSERT INTO verified_names (accountId, kycName) VALUES (?, ?)');
  const kyc = [
    ['ACC-1001', 'Priya Sharma'],
    ['ACC-1002', 'Rahul Verma'],
    ['ACC-1004', 'Vikram Patel'],
    // ACC-1003 (Anita Desai) and ACC-1005 (Sneha Reddy) intentionally unverified
  ];
  const insertKycMany = db.transaction(() => {
    for (const k of kyc) insertKyc.run(...k);
  });
  insertKycMany();

  // ── Known devices for the demo sender ─────────────────────
  const devices = [
    ['SENDER-001', 'DEVICE-001'],
    ['SENDER-001', 'KNOWN-DEVICE'],
    ['SENDER-001', 'device-abc-123'],
    ['SENDER01', 'device-abc-123'],
    ['SENDER01', 'DEVICE-001'],
  ];
  for (const [sender, dev] of devices) {
    db.prepare('INSERT OR IGNORE INTO devices (senderId, deviceId) VALUES (?, ?)').run(sender, dev);
  }

  // ── Prior transactions (so avg-amount & usual-city work) ──
  const insertTx = db.prepare(`
    INSERT INTO transactions (transactionId, evaluationId, senderId, payeeAccountId, payeeDisplayName, amount, status, riskLevel, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEval = db.prepare(`
    INSERT INTO evaluations (evaluationId, senderId, payeeAccountId, payeeDisplayName, amount, deviceId, locationCity, timestamp, riskScore, riskLevel, isNewPayee, payeeVerified, requiredSteps, reasons, executed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const seedTxs = [
    { txId: 'TX-SEED-001', evalId: 'EVAL-SEED-001', sender: 'SENDER-001', payee: 'ACC-1001', name: 'Priya Sharma', amount: 2500, city: 'Chennai', ts: '2026-08-25T10:30:00Z' },
    { txId: 'TX-SEED-002', evalId: 'EVAL-SEED-002', sender: 'SENDER-001', payee: 'ACC-1001', name: 'Priya Sharma', amount: 3000, city: 'Chennai', ts: '2026-08-26T14:00:00Z' },
    { txId: 'TX-SEED-003', evalId: 'EVAL-SEED-003', sender: 'SENDER-001', payee: 'ACC-1002', name: 'Rahul Verma',  amount: 2000, city: 'Chennai', ts: '2026-08-27T09:00:00Z' },
    { txId: 'TX-SEED-004', evalId: 'EVAL-SEED-004', sender: 'SENDER-001', payee: 'ACC-1003', name: 'Anita Desai',  amount: 2500, city: 'Chennai', ts: '2026-08-28T08:00:00Z' },
    { txId: 'TX-SEED-101', evalId: 'EVAL-SEED-101', sender: 'SENDER01',   payee: 'ACC-1001', name: 'Priya Sharma', amount: 2500, city: 'Chennai', ts: '2026-08-25T10:30:00Z' },
    { txId: 'TX-SEED-102', evalId: 'EVAL-SEED-102', sender: 'SENDER01',   payee: 'ACC-1001', name: 'Priya Sharma', amount: 3000, city: 'Chennai', ts: '2026-08-26T14:00:00Z' },
    { txId: 'TX-SEED-103', evalId: 'EVAL-SEED-103', sender: 'SENDER01',   payee: 'ACC-1002', name: 'Rahul Verma',  amount: 2000, city: 'Chennai', ts: '2026-08-27T09:00:00Z' },
    { txId: 'TX-SEED-104', evalId: 'EVAL-SEED-104', sender: 'SENDER01',   payee: 'ACC-1003', name: 'Anita Desai',  amount: 2500, city: 'Chennai', ts: '2026-08-28T08:00:00Z' },
  ];

  const seedTxMany = db.transaction(() => {
    for (const t of seedTxs) {
      insertEval.run(t.evalId, t.sender, t.payee, t.name, t.amount, 'DEVICE-001', t.city, t.ts, 0, 'LOW', 0, 1, '[]', '[]');
      insertTx.run(t.txId, t.evalId, t.sender, t.payee, t.name, t.amount, 'SUCCESS', 'LOW', t.ts);
    }
  });
  seedTxMany();

  console.log('✅ Seed data inserted (5 contacts matching frontend, 3 KYC records, 8 prior transactions)');
}

module.exports = { initDb, getDb };
