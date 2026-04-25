// db.js — IndexedDB wrapper for CoffeeManagerDB

const DB_NAME = 'CoffeeManagerDB';
const DB_VERSION = 1;
let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('beans')) {
        const s = db.createObjectStore('beans', { keyPath: 'id' });
        s.createIndex('by-active', 'active', { unique: false });
      }
      if (!db.objectStoreNames.contains('customers')) {
        const s = db.createObjectStore('customers', { keyPath: 'id' });
        s.createIndex('by-name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains('sales')) {
        const s = db.createObjectStore('sales', { keyPath: 'id' });
        s.createIndex('by-date', 'date', { unique: false });
        s.createIndex('by-customer', 'customerId', { unique: false });
        s.createIndex('by-product', 'product', { unique: false });
      }
      if (!db.objectStoreNames.contains('supplies')) {
        db.createObjectStore('supplies', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('expenses')) {
        const s = db.createObjectStore('expenses', { keyPath: 'id' });
        s.createIndex('by-date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getAll(storeName) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function get(storeName, id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function add(storeName, data) {
  const now = new Date().toISOString();
  const item = { ...data, id: data.id || genId(), createdAt: now, updatedAt: now };
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).add(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  }));
}

function update(storeName, data) {
  const item = { ...data, updatedAt: new Date().toISOString() };
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  }));
}

function remove(storeName, id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function queryByIndex(storeName, indexName, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly')
      .objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// ===== Default seed data =====

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
  coldBrewPrice: 150,
  dripHotPrice: 120,
  dripIcedPrice: 130,
  lattePrice: 80,
  coldBrewCostPerBottle: 55,
  dripCostPerCup: 30,
  latteCostPerCup: 25,
  monthlyTarget: 50000,
};

async function seedDefaultData() {
  const [beans, supplies, existingSettings] = await Promise.all([
    getAll('beans'),
    getAll('supplies'),
    get('settings', 'main'),
  ]);

  if (beans.length === 0) {
    for (const b of DEFAULT_BEANS) await add('beans', b);
  }
  if (supplies.length === 0) {
    for (const s of DEFAULT_SUPPLIES) await add('supplies', s);
  }
  if (!existingSettings) {
    await update('settings', DEFAULT_SETTINGS);
  }
}

async function initDB() {
  await openDB();
  await seedDefaultData();
}

async function clearAllData() {
  const stores = ['beans', 'customers', 'sales', 'supplies', 'expenses', 'settings'];
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    stores.forEach(s => tx.objectStore(s).clear());
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  await seedDefaultData();
}

async function exportAllData() {
  const stores = ['beans', 'customers', 'sales', 'supplies', 'expenses', 'settings'];
  const data = {};
  for (const s of stores) data[s] = await getAll(s);
  return data;
}

async function importAllData(data) {
  const db = await openDB();
  const stores = ['beans', 'customers', 'sales', 'supplies', 'expenses'];
  for (const store of stores) {
    if (!Array.isArray(data[store])) continue;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      data[store].forEach(item => tx.objectStore(store).put(item));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  if (data.settings && data.settings.length > 0) {
    await update('settings', data.settings[0]);
  }
}
