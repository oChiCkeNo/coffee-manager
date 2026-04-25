// db.server.js — HTTP API wrapper
// ใช้แทน db.js เมื่อรันผ่าน Home Server (server.js serves this file as /db.js)
// app.js ไม่ต้องแก้ไขเลย — เรียกฟังก์ชันเดิมทุกตัว

const API = '/api';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function apiFetch(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${method} ${url} → HTTP ${res.status}`);
  return res.json();
}

// ── CRUD (same interface as IndexedDB version) ─────────────────

function getAll(store) {
  return apiFetch('GET', `${API}/${store}`);
}

function get(store, id) {
  return apiFetch('GET', `${API}/${store}/${encodeURIComponent(id)}`);
}

function add(store, data) {
  const now = new Date().toISOString();
  const item = { ...data, id: data.id || genId(), createdAt: now, updatedAt: now };
  return apiFetch('POST', `${API}/${store}`, item);
}

function update(store, data) {
  const item = { ...data, updatedAt: new Date().toISOString() };
  return apiFetch('PUT', `${API}/${store}/${encodeURIComponent(item.id)}`, item);
}

function remove(store, id) {
  return apiFetch('DELETE', `${API}/${store}/${encodeURIComponent(id)}`);
}

// queryByIndex: server ไม่มี index → fetch all + filter
const INDEX_FIELD = {
  'by-active':   'active',
  'by-name':     'name',
  'by-date':     'date',
  'by-customer': 'customerId',
  'by-product':  'product',
};
function queryByIndex(store, indexName, value) {
  const field = INDEX_FIELD[indexName] || indexName.replace('by-', '');
  return getAll(store).then(items => items.filter(i => i[field] === value));
}

// ── Seed default data (same as db.js) ─────────────────────────

const DEFAULT_BEANS = [
  { name: 'Brazil Santos', origin: 'Brazil', process: 'Natural', roastLevel: 'กลาง-เข้ม', roastDate: '2026-04-01', quantity_g: 500, original_quantity_g: 500, cost_total: 250, notes: 'Cold brew / กาแฟนม', active: true },
  { name: 'Ethiopia Yirgacheffe Natural', origin: 'Ethiopia', process: 'Natural', roastLevel: 'อ่อน', roastDate: '2026-04-15', quantity_g: 400, original_quantity_g: 400, cost_total: 560, notes: 'ทดลองเปรียบเทียบ processing', active: true },
  { name: 'Ethiopia Aricha Washed', origin: 'Ethiopia', process: 'Washed', roastLevel: 'อ่อน', roastDate: '2026-04-15', quantity_g: 400, original_quantity_g: 400, cost_total: 560, notes: 'ทดลองเปรียบเทียบ processing', active: true },
  { name: 'Honduras Whiskey Barrel Aged', origin: 'Honduras', process: 'Barrel Aged', roastLevel: 'อ่อน', roastDate: '2026-04-15', quantity_g: 100, original_quantity_g: 100, cost_total: 350, notes: 'รอทดลอง', active: true },
];

const DEFAULT_SUPPLIES = [
  { name: 'ขวดแก้ว 300ml', category: 'บรรจุภัณฑ์', quantity: 0, unit: 'ใบ', costPerUnit: 13, reorderLevel: 20 },
  { name: 'สติกเกอร์ฉลาก', category: 'บรรจุภัณฑ์', quantity: 0, unit: 'แผ่น', costPerUnit: 4, reorderLevel: 20 },
  { name: 'กระดาษกรอง Hario V60 02', category: 'อุปกรณ์ชง', quantity: 100, unit: 'แผ่น', costPerUnit: 1.5, reorderLevel: 30 },
  { name: 'ฝาขวดแก้ว', category: 'บรรจุภัณฑ์', quantity: 0, unit: 'อัน', costPerUnit: 3, reorderLevel: 20 },
];

const DEFAULT_SETTINGS = {
  id: 'main',
  coldBrewPrice: 150, dripHotPrice: 120, dripIcedPrice: 130, lattePrice: 80,
  coldBrewCostPerBottle: 55, dripCostPerCup: 30, latteCostPerCup: 25,
  monthlyTarget: 50000,
};

async function seedDefaultData() {
  const [beans, supplies, existingSettings] = await Promise.all([
    getAll('beans'), getAll('supplies'), get('settings', 'main'),
  ]);
  if (beans.length === 0) for (const b of DEFAULT_BEANS) await add('beans', b);
  if (supplies.length === 0) for (const s of DEFAULT_SUPPLIES) await add('supplies', s);
  if (!existingSettings) await update('settings', DEFAULT_SETTINGS);
}

async function initDB() {
  await seedDefaultData();
}

async function clearAllData() {
  await apiFetch('POST', `${API}/clear-all`);
  await seedDefaultData();
}

async function exportAllData() {
  const stores = ['beans', 'customers', 'sales', 'supplies', 'expenses', 'settings'];
  const data = {};
  for (const s of stores) data[s] = await getAll(s);
  return data;
}

async function importAllData(data) {
  await apiFetch('POST', `${API}/import`, data);
}
