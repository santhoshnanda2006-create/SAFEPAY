const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const contactsRouter = require('./routes/contacts');
const transferRouter = require('./routes/transfer');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());              // wide-open CORS for hackathon demo
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/contacts', contactsRouter);
app.use('/api/transfer', transferRouter);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start (async because sql.js init is async) ──────────────
async function start() {
  await initDb();   // initialise WASM SQLite + create schema + seed

  app.listen(PORT, () => {
    console.log(`\n🚀 Fraud Detection API running on http://localhost:${PORT}`);
    console.log(`   Endpoints:`);
    console.log(`     GET  /api/contacts`);
    console.log(`     POST /api/transfer/evaluate`);
    console.log(`     POST /api/transfer/execute`);
    console.log(`     GET  /api/transfer/history`);
    console.log(`     GET  /api/health\n`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
