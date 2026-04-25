// server.js — Coffee Manager PWA · Local Home Server
// Serves the app + REST API backed by SQLite
// Run: node server.js
// Auto-start: sudo systemctl start coffee-manager

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'coffee.db');

// ── Middleware ────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));

// Serve server-specific versions of these three files
// (overrides the IndexedDB/GitHub-Pages versions transparently)
app.get('/db.js',          (_, res) => res.sendFile(path.join(__dirname, 'db.server.js')));
app.get('/sw.js',          (_, res) => res.sendFile(path.join(__dirname, 'sw.server.js')));
app.get('/manifest.json',  (_, res) => res.sendFile(path.join(__dirname, 'manifest.server.json')));

// All other static files (index.html, app.js, style.css, icons/…)
app.use(express.static(__dirname));

// ── SQLite setup ──────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');   // safe concurrent reads
db.pragma('synchronous = NORMAL'); // faster writes, still safe

const STORES = ['beans', 'customers', 'sales', 'supplies', 'expenses', 'settings'];
STORES.forEach(store => {
  db.prepare(`CREATE TABLE IF NOT EXISTS [${store}] (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )`).run();
});

// ── Helpers ───────────────────────────────────────────────────
const parseRows = rows => rows.map(r => JSON.parse(r.data));

function guardStore(store, res) {
  if (!STORES.includes(store)) { res.status(400).json({ error: 'Unknown store' }); return false; }
  return true;
}

// ── REST API ──────────────────────────────────────────────────

// GET /api/:store  → getAll
app.get('/api/:store', (req, res) => {
  const { store } = req.params;
  if (!guardStore(store, res)) return;
  res.json(parseRows(db.prepare(`SELECT data FROM [${store}]`).all()));
});

// GET /api/:store/:id  → get one (returns null if not found)
app.get('/api/:store/:id', (req, res) => {
  const { store, id } = req.params;
  if (!guardStore(store, res)) return;
  const row = db.prepare(`SELECT data FROM [${store}] WHERE id = ?`).get(id);
  res.json(row ? JSON.parse(row.data) : null);
});

// POST /api/:store  → add (expects full item with id)
app.post('/api/:store', (req, res) => {
  const { store } = req.params;
  if (!guardStore(store, res)) return;
  const item = req.body;
  try {
    db.prepare(`INSERT INTO [${store}] (id, data) VALUES (?, ?)`).run(item.id, JSON.stringify(item));
    res.json(item);
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

// PUT /api/:store/:id  → upsert
app.put('/api/:store/:id', (req, res) => {
  const { store, id } = req.params;
  if (!guardStore(store, res)) return;
  const item = { ...req.body, id };
  db.prepare(`INSERT OR REPLACE INTO [${store}] (id, data) VALUES (?, ?)`).run(id, JSON.stringify(item));
  res.json(item);
});

// DELETE /api/:store/:id
app.delete('/api/:store/:id', (req, res) => {
  const { store, id } = req.params;
  if (!guardStore(store, res)) return;
  db.prepare(`DELETE FROM [${store}] WHERE id = ?`).run(id);
  res.json({ ok: true });
});

// POST /api/clear-all  → ล้างทุก store
app.post('/api/clear-all', (_req, res) => {
  STORES.forEach(store => db.prepare(`DELETE FROM [${store}]`).run());
  res.json({ ok: true });
});

// GET /api/export  → ดาวน์โหลด backup JSON
app.get('/api/export', (req, res) => {
  const data = {};
  STORES.forEach(store => { data[store] = parseRows(db.prepare(`SELECT data FROM [${store}]`).all()); });
  const filename = `coffee-backup-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(data);
});

// POST /api/import  → restore backup JSON
app.post('/api/import', (req, res) => {
  const data = req.body;
  const tx = db.transaction(() => {
    ['beans', 'customers', 'sales', 'supplies', 'expenses'].forEach(store => {
      if (!Array.isArray(data[store])) return;
      db.prepare(`DELETE FROM [${store}]`).run();
      data[store].forEach(item =>
        db.prepare(`INSERT OR REPLACE INTO [${store}] (id, data) VALUES (?, ?)`).run(item.id, JSON.stringify(item))
      );
    });
    if (Array.isArray(data.settings) && data.settings.length > 0) {
      const s = data.settings[0];
      db.prepare(`INSERT OR REPLACE INTO [settings] (id, data) VALUES (?, ?)`).run(s.id, JSON.stringify(s));
    }
  });
  tx();
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log(`\n☕  Coffee Manager is running\n`);
  console.log(`   This machine : http://localhost:${PORT}`);
  console.log(`   Tablet / PC  : http://${localIP}:${PORT}`);
  console.log(`\n   Database     : ${DB_PATH}`);
  console.log(`   Stop         : Ctrl+C  (or: sudo systemctl stop coffee-manager)\n`);
});
