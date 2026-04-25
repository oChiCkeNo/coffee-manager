// server.js — Coffee Manager PWA · Local Home Server (Security Hardened v4)
// FIX: Route order — specific routes before generic /api/:store

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DB_PATH = path.join(__dirname, 'coffee.db');

if (!ADMIN_PASSWORD) {
  console.error('\n❌ ERROR: ADMIN_PASSWORD ไม่ได้ตั้งค่า\n');
  process.exit(1);
}

app.set('trust proxy', 'loopback');

// ── Helmet ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],   // อนุญาต onclick="..." inline handlers
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
  // ปิด HSTS เพราะใช้ HTTP ใน LAN (ไม่มี SSL cert)
  strictTransportSecurity: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

// ── Request logging ────────────────────────────────────────────
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`[${ts}] ${ip} ${req.method} ${req.url}`);
  next();
});

// ── Rate limiting ──────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { error: 'Too many requests' },
  standardHeaders: true, legacyHeaders: false,
});
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many admin requests' },
  standardHeaders: true, legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use(express.json({ limit: '1mb' }));

// ── Admin auth ─────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const password = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (password !== ADMIN_PASSWORD) {
    console.warn(`[AUTH FAIL] ${req.ip} tried ${req.method} ${req.url}`);
    return res.status(401).json({ error: 'Admin password required or incorrect' });
  }
  next();
}

// ── Static file overrides ──────────────────────────────────────
app.get('/db.js',         (_, res) => res.sendFile(path.join(__dirname, 'db.server.js')));
app.get('/sw.js',         (_, res) => res.sendFile(path.join(__dirname, 'sw.server.js')));
app.get('/manifest.json', (_, res) => res.sendFile(path.join(__dirname, 'manifest.server.json')));
app.use(express.static(__dirname));

// ── SQLite ─────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

const STORES = ['beans', 'customers', 'sales', 'supplies', 'expenses', 'settings', 'coldbrewBatches'];
STORES.forEach(store => {
  db.prepare(`CREATE TABLE IF NOT EXISTS [${store}] (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )`).run();
});

const parseRows = rows => rows.map(r => JSON.parse(r.data));
function guardStore(store, res) {
  if (!STORES.includes(store)) { res.status(400).json({ error: 'Unknown store' }); return false; }
  return true;
}

// ══════════════════════════════════════════════════════════════
// Routes — SPECIFIC FIRST, then generic /api/:store
// ══════════════════════════════════════════════════════════════

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Clear all (admin)
app.post('/api/clear-all', adminLimiter, requireAdmin, (req, res) => {
  STORES.forEach(store => db.prepare(`DELETE FROM [${store}]`).run());
  console.log(`[ADMIN] CLEAR ALL by ${req.ip}`);
  res.json({ ok: true });
});

// Export (open)
app.get('/api/export', (req, res) => {
  const data = {};
  STORES.forEach(store => { data[store] = parseRows(db.prepare(`SELECT data FROM [${store}]`).all()); });
  res.setHeader('Content-Disposition', `attachment; filename="coffee-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(data);
});

// Import (admin)
app.post('/api/import', adminLimiter, requireAdmin, (req, res) => {
  const data = req.body.data || req.body;
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
  console.log(`[ADMIN] IMPORT by ${req.ip}`);
  res.json({ ok: true });
});

// Generic CRUD — MUST come after specific routes
app.get('/api/:store', (req, res) => {
  const { store } = req.params;
  if (!guardStore(store, res)) return;
  res.json(parseRows(db.prepare(`SELECT data FROM [${store}]`).all()));
});

app.get('/api/:store/:id', (req, res) => {
  const { store, id } = req.params;
  if (!guardStore(store, res)) return;
  const row = db.prepare(`SELECT data FROM [${store}] WHERE id = ?`).get(id);
  res.json(row ? JSON.parse(row.data) : null);
});

app.post('/api/:store', (req, res) => {
  const { store } = req.params;
  if (!guardStore(store, res)) return;
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: 'Missing id' });
  try {
    db.prepare(`INSERT INTO [${store}] (id, data) VALUES (?, ?)`).run(item.id, JSON.stringify(item));
    res.json(item);
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

app.put('/api/:store/:id', (req, res) => {
  const { store, id } = req.params;
  if (!guardStore(store, res)) return;
  const item = { ...req.body, id };
  db.prepare(`INSERT OR REPLACE INTO [${store}] (id, data) VALUES (?, ?)`).run(id, JSON.stringify(item));
  res.json(item);
});

app.delete('/api/:store/:id', adminLimiter, requireAdmin, (req, res) => {
  const { store, id } = req.params;
  if (!guardStore(store, res)) return;
  db.prepare(`DELETE FROM [${store}] WHERE id = ?`).run(id);
  console.log(`[ADMIN] DELETE ${store}/${id} by ${req.ip}`);
  res.json({ ok: true });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  db.close();
  console.log('[DB] Closed safely');
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start
app.listen(PORT, BIND_HOST, () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log(`\n☕  Coffee Manager (Hardened v4) is running\n`);
  console.log(`   Bind         : ${BIND_HOST}:${PORT}`);
  console.log(`   This machine : http://localhost:${PORT}`);
  console.log(`   Tablet / PC  : http://${localIP}:${PORT}`);
  console.log(`   Database     : ${DB_PATH}`);
  console.log(`   Admin auth   : ✅ enabled`);
  console.log(`   Rate limit   : 500 req/15min general, 5 req/15min admin`);
  console.log(`   Stop         : pm2 stop coffee-manager\n`);
});
