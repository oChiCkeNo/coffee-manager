// app.js — Coffee Manager PWA main logic

// ===== CONSTANTS =====
const PRODUCTS = [
  { key: 'cold_brew', label: 'Cold Brew', icon: '🧊', gramsPerUnit: 26 },
  { key: 'drip_hot',  label: 'Drip (ร้อน)', icon: '☕', gramsPerUnit: 20 },
  { key: 'drip_iced', label: 'Japanese Iced', icon: '🧋', gramsPerUnit: 20 },
  { key: 'latte',     label: 'กาแฟนม', icon: '🥛', gramsPerUnit: 20 },
];

const CHANNELS = ['LINE OA', 'Instagram', 'TikTok', 'Walk-in', 'Grab', 'LINE MAN', 'อื่นๆ'];
const PROCESSES = ['Natural', 'Washed', 'Honey', 'Lactic Fermentation', 'Anaerobic', 'Barrel Aged', 'อื่นๆ'];
const ROAST_LEVELS = ['อ่อน', 'กลาง-อ่อน', 'กลาง', 'กลาง-เข้ม', 'เข้ม'];
const EXPENSE_CATS = ['วัตถุดิบ', 'บรรจุภัณฑ์', 'อุปกรณ์', 'ค่าส่ง', 'ค่าธรรมเนียม', 'การตลาด', 'ค่าน้ำ/ไฟ', 'อื่นๆ'];
const SUPPLY_CATS = ['บรรจุภัณฑ์', 'อุปกรณ์ชง', 'วัตถุดิบ', 'อื่นๆ'];
const CUSTOMER_CHANNELS = ['LINE OA', 'Instagram', 'TikTok', 'Walk-in', 'Grab', 'LINE MAN', 'อื่นๆ'];
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

// ===== STATE =====
let currentTab = 'dashboard';
let appSettings = null;
let salesFilter = 'all';
let salesFilterDate = null;
let customerSearch = '';
let quickSalePreset = null;

// ===== ADMIN AUTH =====
let _adminResolve = null;

/**
 * ตรวจ/ขอ admin password ก่อนทำ action อันตราย
 * - SERVER_MODE=false (GitHub Pages/IndexedDB) → ผ่านเลย ไม่ต้องใส่
 * - มี password แคชใน sessionStorage → ผ่านเลย
 * - ไม่มี → แสดง modal ให้ใส่
 * return true ถ้า OK, false ถ้า cancel
 */
async function requireAdmin() {
  if (!window.SERVER_MODE) return true;
  if (sessionStorage.getItem('adminPwd')) return true;
  return new Promise(resolve => {
    _adminResolve = resolve;
    openModal(`<div class="modal">
      <div class="modal-header">
        <h3>🔐 ยืนยันตัวตน Admin</h3>
        <button class="modal-close" onclick="cancelAdminPwd()">✕</button>
      </div>
      <div class="modal-body">
        <p class="text-muted" style="font-size:0.85rem;margin-bottom:14px">
          การดำเนินการนี้ต้องการรหัส admin
        </p>
        <div class="form-group">
          <label>รหัสผ่าน</label>
          <input type="password" id="admin-pwd-input" placeholder="ใส่รหัส admin"
            onkeydown="if(event.key==='Enter')submitAdminPwd()">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="submitAdminPwd()">✅ ยืนยัน</button>
        <button class="btn btn-ghost" onclick="cancelAdminPwd()">ยกเลิก</button>
      </div>
    </div>`);
    setTimeout(() => document.getElementById('admin-pwd-input')?.focus(), 60);
  });
}

function submitAdminPwd() {
  const pwd = document.getElementById('admin-pwd-input')?.value?.trim();
  if (!pwd) { document.getElementById('admin-pwd-input')?.focus(); return; }
  sessionStorage.setItem('adminPwd', pwd);
  closeModal();
  if (_adminResolve) { _adminResolve(true); _adminResolve = null; }
}

function cancelAdminPwd() {
  closeModal();
  if (_adminResolve) { _adminResolve(false); _adminResolve = null; }
}

function logoutAdmin() {
  sessionStorage.removeItem('adminPwd');
  showToast('🔓 Logout admin แล้ว');
}

/** จัดการ AdminAuthError: ล้าง cache, แสดง toast, return true ถ้า error นั้นคือ 401 */
function handleAdminError(e) {
  if (e.name === 'AdminAuthError') {
    sessionStorage.removeItem('adminPwd');
    showToast('❌ รหัส admin ไม่ถูกต้อง');
    return true;
  }
  return false;
}

// ===== UTILS =====
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function thisMonthISO() {
  return new Date().toISOString().slice(0, 7);
}

function daysSince(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now - d) / 86400000);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`;
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== PEAK PERIOD =====
function getPeakStatus(roastDate, roastLevel) {
  const days = daysSince(roastDate);
  const light = roastLevel === 'อ่อน';
  let label, cls;

  if (light) {
    if (days <= 6)          { label = `Degassing (วันที่ ${days})`; cls = 'badge-muted'; }
    else if (days <= 9)     { label = `Peak (วันที่ ${days})`;      cls = 'badge-green'; }
    else if (days <= 13)    { label = `Sweet Spot (วันที่ ${days})`; cls = 'badge-yellow'; }
    else if (days <= 14)    { label = `Peak (วันที่ ${days})`;      cls = 'badge-green'; }
    else if (days <= 21)    { label = `Fading (วันที่ ${days})`;    cls = 'badge-orange'; }
    else                    { label = `Expired (วันที่ ${days})`;   cls = 'badge-red'; }
  } else {
    if (days <= 4)          { label = `Degassing (วันที่ ${days})`; cls = 'badge-muted'; }
    else if (days <= 7)     { label = `Peak (วันที่ ${days})`;      cls = 'badge-green'; }
    else if (days <= 11)    { label = `Sweet Spot (วันที่ ${days})`; cls = 'badge-yellow'; }
    else if (days <= 12)    { label = `Peak (วันที่ ${days})`;      cls = 'badge-green'; }
    else if (days <= 19)    { label = `Fading (วันที่ ${days})`;    cls = 'badge-orange'; }
    else                    { label = `Expired (วันที่ ${days})`;   cls = 'badge-red'; }
  }
  return { label, cls, days };
}

function getProcessBadge(process) {
  if (process === 'Natural') return 'badge-natural';
  if (process === 'Washed')  return 'badge-washed';
  return 'badge-other';
}

// ===== MODAL =====
function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = html;
  overlay.classList.add('active');
  setTimeout(() => {
    const first = overlay.querySelector('input:not([type=checkbox]), select, textarea');
    if (first) first.focus();
  }, 80);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
  overlay.innerHTML = '';
  quickSalePreset = null;
}

// ===== NAV =====
const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'beans',     label: 'สต็อกเมล็ด', icon: '🫘' },
  { key: 'sales',     label: 'การขาย',     icon: '💰' },
  { key: 'customers', label: 'ลูกค้า',     icon: '👥' },
  { key: 'supplies',  label: 'สิ้นเปลือง', icon: '📦' },
  { key: 'expenses',  label: 'รายจ่าย',   icon: '🧾' },
  { key: 'settings',  label: 'ตั้งค่า',   icon: '⚙️' },
];

function renderNav() {
  const sidebar = document.getElementById('sidebar-nav');
  const bottomInner = document.getElementById('bottom-nav-inner');

  const navItemHtml = t => `<div class="nav-item${currentTab === t.key ? ' active' : ''}" onclick="switchTab('${t.key}')">
    <span class="nav-icon">${t.icon}</span>
    <span class="nav-label">${t.label}</span>
  </div>`;

  const bnItemHtml = t => `<div class="bottom-nav-item${currentTab === t.key ? ' active' : ''}" onclick="switchTab('${t.key}')">
    <span class="bn-icon">${t.icon}</span>
    <span>${t.label}</span>
  </div>`;

  sidebar.innerHTML = TABS.map(navItemHtml).join('');
  bottomInner.innerHTML = TABS.map(bnItemHtml).join('');
}

async function switchTab(tab) {
  currentTab = tab;
  renderNav();

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('content').scrollTop = 0;

  switch (tab) {
    case 'dashboard': await renderDashboard(); break;
    case 'beans':     await renderBeans();     break;
    case 'sales':     await renderSales();     break;
    case 'customers': await renderCustomers(); break;
    case 'supplies':  await renderSupplies();  break;
    case 'expenses':  await renderExpenses();  break;
    case 'settings':  await renderSettings();  break;
  }
}

// ===== DASHBOARD =====
async function renderDashboard() {
  const [allSales, allExpenses, allBeans, allSupplies] = await Promise.all([
    getAll('sales'), getAll('expenses'), getAll('beans'), getAll('supplies'),
  ]);

  const today = todayISO();
  const thisMonth = thisMonthISO();

  const todaySales = allSales.filter(s => s.date === today);
  const monthSales = allSales.filter(s => s.date.startsWith(thisMonth));
  const monthExp = allExpenses.filter(e => e.date.startsWith(thisMonth));

  const todayRev = todaySales.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const todayCount = todaySales.length;
  const monthRev = monthSales.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const monthCogs = monthSales.reduce((sum, s) => sum + s.cost * s.quantity, 0);
  const monthExpTotal = monthExp.reduce((sum, e) => sum + e.amount, 0);
  const monthProfit = monthRev - monthCogs - monthExpTotal;
  const target = appSettings?.monthlyTarget || 50000;
  const targetPct = target > 0 ? Math.min(100, Math.round(monthRev / target * 100)) : 0;

  // 7-day chart
  const chartDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    const rev = allSales.filter(s => s.date === dStr).reduce((sum, s) => sum + s.price * s.quantity, 0);
    chartDays.push({ dStr, rev, label: TH_DAYS_SHORT[d.getDay()], isToday: dStr === today });
  }
  const maxRev = Math.max(...chartDays.map(d => d.rev), 1);

  // Product breakdown
  const prodBreakdown = PRODUCTS.map(p => {
    const ps = monthSales.filter(s => s.product === p.key);
    return { ...p, qty: ps.reduce((sum, s) => sum + s.quantity, 0), rev: ps.reduce((sum, s) => sum + s.price * s.quantity, 0) };
  }).filter(p => p.qty > 0);

  // Active beans
  const activeBeans = allBeans.filter(b => b.active && b.quantity_g > 0);

  // Alerts
  const lowSupplies = allSupplies.filter(s => s.quantity <= s.reorderLevel);
  const problemBeans = allBeans.filter(b => b.active && b.quantity_g > 0 && ['Fading', 'Expired'].some(x => getPeakStatus(b.roastDate, b.roastLevel).label.startsWith(x)));

  const profitClass = monthProfit >= 0 ? 'green' : 'red';

  document.getElementById('tab-dashboard').innerHTML = `
    <div class="page-header">
      <div class="page-title">📊 Dashboard</div>
      <div class="text-muted" style="font-size:0.8rem">${formatDate(today)}</div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">รายได้วันนี้</div>
        <div class="metric-value accent">฿${formatMoney(todayRev)}</div>
        <div class="metric-sub">${todayCount} รายการ</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">รายได้เดือนนี้</div>
        <div class="metric-value green">฿${formatMoney(monthRev)}</div>
        <div class="metric-sub">${monthSales.length} รายการ</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">กำไรสุทธิเดือนนี้</div>
        <div class="metric-value ${profitClass}">฿${formatMoney(monthProfit)}</div>
        <div class="metric-sub">หลังหักต้นทุน+ค่าใช้จ่าย</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">% เทียบเป้า ฿${formatMoney(target)}</div>
        <div class="metric-value accent">${targetPct}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${targetPct}%"></div></div>
      </div>
    </div>

    <div class="chart-wrap dash-section">
      <div class="dash-section-title">รายได้ 7 วันล่าสุด</div>
      <div class="bar-chart">
        ${chartDays.map(d => `
          <div class="bar-col${d.isToday ? ' today' : ''}">
            <div class="bar-val">${d.rev > 0 ? '฿' + formatMoney(d.rev) : ''}</div>
            <div class="bar" style="height:${Math.max(2, Math.round(d.rev / maxRev * 80))}px"></div>
            <div class="bar-label">${d.label}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${prodBreakdown.length > 0 ? `
    <div class="dash-section">
      <div class="dash-section-title">สัดส่วนสินค้าเดือนนี้</div>
      ${prodBreakdown.map(p => `
        <div class="product-row">
          <span class="product-icon">${p.icon}</span>
          <span class="product-name">${p.label}</span>
          <span class="product-qty">${p.qty} ชิ้น</span>
          <span class="product-rev">฿${formatMoney(p.rev)}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${activeBeans.length > 0 ? `
    <div class="dash-section">
      <div class="dash-section-title">สถานะเมล็ดกาแฟ</div>
      ${activeBeans.map(b => {
        const ps = getPeakStatus(b.roastDate, b.roastLevel);
        return `<div class="bean-status-row">
          <div>
            <div class="bsr-name">${escHtml(b.name)}</div>
            <div class="bsr-info">คั่ว ${formatDateShort(b.roastDate)}</div>
          </div>
          <span class="badge ${ps.cls}">${ps.label}</span>
          <span class="bsr-qty${b.quantity_g < 50 ? ' low' : ''}">${b.quantity_g}g</span>
        </div>`;
      }).join('')}
    </div>
    ` : ''}

    <div class="dash-section">
      <div class="dash-section-title">แจ้งเตือน</div>
      ${lowSupplies.length === 0 && problemBeans.length === 0 ?
        `<div class="alert-row alert-ok">✅ ไม่มีรายการเร่งด่วน</div>` : ''}
      ${lowSupplies.map(s => `<div class="alert-row alert-supply">📦 <strong>${escHtml(s.name)}</strong> เหลือ ${s.quantity} ${s.unit} (ต่ำกว่า reorder ${s.reorderLevel})</div>`).join('')}
      ${problemBeans.map(b => {
        const ps = getPeakStatus(b.roastDate, b.roastLevel);
        return `<div class="alert-row alert-bean">🫘 <strong>${escHtml(b.name)}</strong> — ${ps.label}</div>`;
      }).join('')}
    </div>

    <div class="dash-section">
      <div class="dash-section-title">สรุป P&L เดือนนี้</div>
      <div class="pnl-row"><span class="pnl-label">รายได้</span><span class="text-green">฿${formatMoney(monthRev)}</span></div>
      <div class="pnl-row"><span class="pnl-label">ต้นทุนสินค้า (COGS)</span><span class="text-red">-฿${formatMoney(monthCogs)}</span></div>
      <div class="pnl-row"><span class="pnl-label">ค่าใช้จ่ายอื่นๆ</span><span class="text-red">-฿${formatMoney(monthExpTotal)}</span></div>
      <div class="pnl-row"><span class="pnl-label">กำไรสุทธิ</span><span class="${monthProfit >= 0 ? 'text-green' : 'text-red'}">฿${formatMoney(monthProfit)} (${monthRev > 0 ? Math.round(monthProfit / monthRev * 100) : 0}%)</span></div>
    </div>
  `;
}

// ===== BEANS =====
async function renderBeans() {
  const beans = await getAll('beans');
  beans.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || new Date(b.roastDate) - new Date(a.roastDate));

  const active = beans.filter(b => b.active && b.quantity_g > 0);
  const inactive = beans.filter(b => !b.active || b.quantity_g === 0);

  const renderRow = b => {
    const ps = getPeakStatus(b.roastDate, b.roastLevel);
    const origQty = b.original_quantity_g || b.quantity_g;
    const costPerG = b.cost_total && origQty ? (b.cost_total / origQty).toFixed(2) : '—';
    const histCount = (b.purchaseHistory || []).length;
    return `<tr class="${(!b.active || b.quantity_g === 0) ? 'beans-inactive' : ''}">
      <td>
        <div class="fw-bold">${escHtml(b.name)}</div>
        <div class="text-muted" style="font-size:0.75rem">${escHtml(b.origin || '')}</div>
        ${histCount > 0 ? `<div style="font-size:0.68rem;color:var(--accent);margin-top:2px;cursor:pointer" onclick="viewPurchaseHistory('${b.id}')">📋 ${histCount} ล็อต</div>` : ''}
      </td>
      <td><span class="badge ${getProcessBadge(b.process)}">${escHtml(b.process)}</span></td>
      <td>${escHtml(b.roastLevel)}</td>
      <td>${formatDate(b.roastDate)}</td>
      <td><span class="badge ${ps.cls}">${ps.label}</span></td>
      <td class="${b.quantity_g < 50 ? 'red' : ''}">${b.quantity_g}g</td>
      <td>
        <div>${costPerG !== '—' ? costPerG + '฿' : '—'}</div>
        ${histCount > 0 ? `<div style="font-size:0.68rem;color:var(--text-muted);cursor:pointer" onclick="viewPurchaseHistory('${b.id}')">ดูประวัติ ▸</div>` : ''}
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="openDeductBean('${b.id}')">หัก</button>
          <button class="btn btn-outline btn-sm" onclick="openRestockModal('${b.id}')">เติมสต็อก</button>
          <button class="btn btn-ghost btn-sm" onclick="openBeanModal('${b.id}')">แก้ไข</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBean('${b.id}')">ลบ</button>
        </div>
      </td>
    </tr>`;
  };

  document.getElementById('tab-beans').innerHTML = `
    <div class="page-header">
      <div class="page-title">🫘 สต็อกเมล็ดกาแฟ</div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openBeanModal()">+ เพิ่มเมล็ด</button>
      </div>
    </div>

    <div class="table-wrap" style="margin-bottom:20px">
      <table>
        <thead><tr>
          <th>เมล็ด</th><th>Process</th><th>คั่ว</th><th>Roast Date</th>
          <th>สถานะ</th><th>คงเหลือ</th><th>ต้นทุน/g</th><th>จัดการ</th>
        </tr></thead>
        <tbody>
          ${active.length > 0 ? active.map(renderRow).join('') : ''}
          ${inactive.length > 0 ? inactive.map(renderRow).join('') : ''}
          ${beans.length === 0 ? '<tr class="empty-row"><td colspan="8">ยังไม่มีเมล็ดกาแฟ — กด "+ เพิ่มเมล็ด" เพื่อเริ่มต้น</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
}

function openBeanModal(id) {
  let bean = null;
  if (id) {
    getAll('beans').then(beans => {
      bean = beans.find(b => b.id === id);
      _showBeanModal(bean);
    });
  } else {
    _showBeanModal(null);
  }
}

function _showBeanModal(bean) {
  const isEdit = !!bean;
  const opts = (arr, val) => arr.map(v => `<option value="${v}"${v === val ? ' selected' : ''}>${v}</option>`).join('');

  openModal(`<div class="modal">
    <div class="modal-header">
      <h3>${isEdit ? 'แก้ไขเมล็ดกาแฟ' : 'เพิ่มเมล็ดกาแฟใหม่'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>ชื่อเมล็ด *</label>
        <input type="text" id="bn-name" value="${escHtml(bean?.name || '')}" placeholder="เช่น Ethiopia Yirgacheffe Natural"></div>
      <div class="form-row">
        <div class="form-group"><label>แหล่งปลูก / Origin</label>
          <input type="text" id="bn-origin" value="${escHtml(bean?.origin || '')}" placeholder="เช่น Ethiopia"></div>
        <div class="form-group"><label>Processing</label>
          <select id="bn-process">${opts(PROCESSES, bean?.process)}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ระดับคั่ว</label>
          <select id="bn-roastlevel">${opts(ROAST_LEVELS, bean?.roastLevel || 'กลาง')}</select></div>
        <div class="form-group"><label>Roast Date *</label>
          <input type="date" id="bn-roastdate" value="${bean?.roastDate || todayISO()}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>น้ำหนัก (กรัม)</label>
          <input type="number" id="bn-qty" value="${bean?.quantity_g || ''}" min="0" placeholder="0"></div>
        <div class="form-group"><label>ราคารวม (บาท)</label>
          <input type="number" id="bn-cost" value="${bean?.cost_total || ''}" min="0" placeholder="0"></div>
      </div>
      <div class="form-group"><label>หมายเหตุ</label>
        <input type="text" id="bn-notes" value="${escHtml(bean?.notes || '')}" placeholder="บันทึกเพิ่มเติม"></div>
      <div class="form-group">
        <label><input type="checkbox" id="bn-active"${(bean?.active !== false) ? ' checked' : ''}> ใช้งานอยู่</label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="saveBean('${bean?.id || ''}')">💾 บันทึก</button>
    </div>
  </div>`);
}

async function saveBean(id) {
  const name = document.getElementById('bn-name').value.trim();
  const roastDate = document.getElementById('bn-roastdate').value;
  if (!name) { showToast('⚠️ กรุณาระบุชื่อเมล็ด'); return; }
  if (!roastDate) { showToast('⚠️ กรุณาระบุวันที่คั่ว'); return; }

  const quantity_g = parseFloat(document.getElementById('bn-qty').value) || 0;
  const cost_total = parseFloat(document.getElementById('bn-cost').value) || 0;

  const data = {
    name,
    origin: document.getElementById('bn-origin').value.trim(),
    process: document.getElementById('bn-process').value,
    roastLevel: document.getElementById('bn-roastlevel').value,
    roastDate,
    quantity_g,
    cost_total,
    // original_quantity_g เก็บน้ำหนักตอนซื้อ ใช้คำนวณต้นทุน/g
    // อัปเดตทุกครั้งที่ user แก้ไขข้อมูลการซื้อ (ไม่เปลี่ยนตอนหัก)
    original_quantity_g: quantity_g,
    notes: document.getElementById('bn-notes').value.trim(),
    active: document.getElementById('bn-active').checked,
  };

  if (id) {
    // เก็บ original_quantity_g เดิมถ้ามี แต่ถ้า quantity_g เพิ่มขึ้น = restocking → อัปเดต
    const existing = await get('beans', id);
    const prevOrig = existing?.original_quantity_g || existing?.quantity_g || 0;
    data.original_quantity_g = quantity_g >= (existing?.quantity_g || 0)
      ? quantity_g   // restock หรือแก้ไขตัวเลขซื้อ → อัปเดต
      : prevOrig;    // แค่แก้ชื่อ/ข้อมูลอื่น → คง original เดิม
    await update('beans', { ...data, id });
  } else {
    await add('beans', data);
  }

  closeModal();
  showToast('✅ บันทึกเรียบร้อย');
  await renderBeans();
}

function openDeductBean(id) {
  getAll('beans').then(beans => {
    const bean = beans.find(b => b.id === id);
    if (!bean) return;
    openModal(`<div class="modal">
      <div class="modal-header">
        <h3>หักสต็อก — ${escHtml(bean.name)}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p class="text-muted mb-12">คงเหลือ: <strong>${bean.quantity_g}g</strong></p>
        <div class="form-group"><label>จำนวนที่หัก (กรัม)</label>
          <input type="number" id="deduct-qty" min="1" max="${bean.quantity_g}" placeholder="0"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
        <button class="btn btn-primary" onclick="doDeductBean('${id}', ${bean.quantity_g})">หัก</button>
      </div>
    </div>`);
  });
}

async function doDeductBean(id, currentQty) {
  const deduct = parseFloat(document.getElementById('deduct-qty').value) || 0;
  if (deduct <= 0) { showToast('⚠️ ระบุจำนวน'); return; }
  const newQty = Math.max(0, currentQty - deduct);
  const bean = await get('beans', id);
  await update('beans', { ...bean, quantity_g: newQty });
  closeModal();
  showToast(`✅ หัก ${deduct}g แล้ว เหลือ ${newQty}g`);
  await renderBeans();
}

async function deleteBean(id) {
  if (!confirm('ลบเมล็ดนี้ออกจากระบบ?')) return;
  if (!await requireAdmin()) return;
  try {
    await remove('beans', id);
    showToast('ลบแล้ว');
    await renderBeans();
  } catch(e) { if (!handleAdminError(e)) throw e; }
}

// ===== RESTOCK =====
function openRestockModal(id) {
  get('beans', id).then(bean => {
    if (!bean) return;
    openModal(`<div class="modal">
      <div class="modal-header">
        <h3>🔄 เติมสต็อก — ${escHtml(bean.name)}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p class="text-muted mb-12">สต็อกปัจจุบัน: <strong>${bean.quantity_g}g</strong> | ต้นทุน/g ล็อตล่าสุด: <strong>${bean.cost_total && bean.original_quantity_g ? (bean.cost_total / bean.original_quantity_g).toFixed(2) + '฿' : '—'}</strong></p>
        <div class="form-row">
          <div class="form-group"><label>วันที่ซื้อ</label>
            <input type="date" id="rs-date" value="${todayISO()}"></div>
          <div class="form-group"><label>Roast Date ล็อตใหม่</label>
            <input type="date" id="rs-roastdate" value="${bean.roastDate}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>น้ำหนักที่ซื้อ (กรัม)</label>
            <input type="number" id="rs-qty" min="1" placeholder="0" oninput="updateRestockSummary()"></div>
          <div class="form-group"><label>ราคารวมที่จ่าย (฿)</label>
            <input type="number" id="rs-cost" min="0" placeholder="0" oninput="updateRestockSummary()"></div>
        </div>
        <div class="form-group"><label>หมายเหตุ (เช่น ล็อต, ผู้ขาย)</label>
          <input type="text" id="rs-note" placeholder="เช่น ล็อต 2/2026, สั่งจาก X Roaster"></div>
        <div class="form-summary" id="rs-summary">
          <div class="form-summary-row"><span>ต้นทุน/g ล็อตนี้</span><span id="rs-cpg">—</span></div>
          <div class="form-summary-row"><span>สต็อกรวมหลังเติม</span><span id="rs-total">—</span></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
        <button class="btn btn-primary" onclick="saveRestock('${id}', ${bean.quantity_g})">✅ บันทึกการเติมสต็อก</button>
      </div>
    </div>`);
  });
}

function updateRestockSummary() {
  const qty = parseFloat(document.getElementById('rs-qty')?.value) || 0;
  const cost = parseFloat(document.getElementById('rs-cost')?.value) || 0;
  const currentQty = parseFloat(document.getElementById('rs-total')?.dataset?.current || 0);
  document.getElementById('rs-cpg').textContent = qty > 0 ? (cost / qty).toFixed(2) + '฿/g' : '—';
  document.getElementById('rs-total').textContent = qty > 0 ? (qty) + 'g (รวม ' + qty + 'g เพิ่ม)' : '—';
}

async function saveRestock(id, currentQty) {
  const date = document.getElementById('rs-date').value;
  const roastDate = document.getElementById('rs-roastdate').value;
  const qty = parseFloat(document.getElementById('rs-qty').value) || 0;
  const cost = parseFloat(document.getElementById('rs-cost').value) || 0;
  const note = document.getElementById('rs-note').value.trim();

  if (!date || qty <= 0) { showToast('⚠️ ระบุวันที่และน้ำหนัก'); return; }

  const bean = await get('beans', id);
  const history = bean.purchaseHistory || [];

  // บันทึกล็อตเดิมก่อน ถ้ายังไม่มี history
  if (history.length === 0 && bean.quantity_g > 0) {
    history.push({
      date: bean.createdAt?.slice(0, 10) || date,
      roastDate: bean.roastDate,
      quantity_g: bean.original_quantity_g || bean.quantity_g,
      cost_total: bean.cost_total,
      cost_per_g: bean.cost_total && (bean.original_quantity_g || bean.quantity_g)
        ? (bean.cost_total / (bean.original_quantity_g || bean.quantity_g))
        : 0,
      note: 'ล็อตแรก',
    });
  }

  // เพิ่มล็อตใหม่
  history.push({
    date,
    roastDate,
    quantity_g: qty,
    cost_total: cost,
    cost_per_g: qty > 0 ? cost / qty : 0,
    note,
  });

  await update('beans', {
    ...bean,
    quantity_g: currentQty + qty,       // เพิ่มสต็อก
    original_quantity_g: qty,            // ต้นทุน/g คำนวณจากล็อตล่าสุด
    cost_total: cost,
    roastDate: roastDate || bean.roastDate,
    purchaseHistory: history,
  });

  closeModal();
  showToast(`✅ เติมสต็อก ${qty}g แล้ว รวม ${currentQty + qty}g`);
  await renderBeans();
}

// ===== PURCHASE HISTORY =====
function viewPurchaseHistory(id) {
  get('beans', id).then(bean => {
    if (!bean) return;
    const history = [...(bean.purchaseHistory || [])].reverse(); // ใหม่ก่อน

    openModal(`<div class="modal modal-lg">
      <div class="modal-header">
        <h3>📋 ประวัติการซื้อ — ${escHtml(bean.name)}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        ${history.length === 0 ? '<p class="text-muted">ยังไม่มีประวัติการซื้อ<br>กด "เติมสต็อก" เพื่อบันทึกล็อตถัดไป</p>' : ''}
        ${history.length > 0 ? `
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>วันที่ซื้อ</th>
              <th>Roast Date</th>
              <th>น้ำหนัก</th>
              <th>ราคารวม</th>
              <th>ต้นทุน/g</th>
              <th>หมายเหตุ</th>
            </tr></thead>
            <tbody>
              ${history.map((h, i) => {
                const isLatest = i === 0;
                return `<tr${isLatest ? ' style="background:rgba(200,149,108,0.08)"' : ''}>
                  <td>${formatDate(h.date)}${isLatest ? ' <span class="badge badge-accent" style="font-size:0.6rem">ล่าสุด</span>' : ''}</td>
                  <td>${formatDate(h.roastDate)}</td>
                  <td>${h.quantity_g}g</td>
                  <td class="money-green">฿${formatMoney(h.cost_total)}</td>
                  <td class="${isLatest ? 'text-accent fw-bold' : ''}">${h.cost_per_g > 0 ? h.cost_per_g.toFixed(2) + '฿' : '—'}</td>
                  <td class="muted">${escHtml(h.note || '—')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:12px;font-size:0.78rem;color:var(--text-muted)">
          รวม ${history.length} ล็อต |
          ต้นทุน/g ต่ำสุด: <span class="text-green">${Math.min(...history.map(h => h.cost_per_g)).toFixed(2)}฿</span> |
          สูงสุด: <span class="text-red">${Math.max(...history.map(h => h.cost_per_g)).toFixed(2)}฿</span>
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal();openRestockModal('${id}')">+ เติมสต็อก</button>
        <button class="btn btn-ghost" onclick="closeModal()">ปิด</button>
      </div>
    </div>`);
  });
}

// ===== COLD BREW BATCH CALCULATOR =====
async function openColdBrewCalcModal() {
  const allBeans = await getAll('beans');
  const activeBeans = allBeans.filter(b => b.active && b.quantity_g > 0);

  const beanOpts = `<option value="">— เลือกเมล็ดกาแฟ —</option>` +
    activeBeans.map(b => {
      const origQty = b.original_quantity_g || b.quantity_g;
      const costPerG = b.cost_total && origQty ? (b.cost_total / origQty).toFixed(2) : '0';
      return `<option value="${b.id}" data-cpg="${costPerG}">${escHtml(b.name)} (${costPerG}฿/g)</option>`;
    }).join('');

  openModal(`<div class="modal">
    <div class="modal-header">
      <h3>🧮 คำนวณต้นทุน Cold Brew</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>เมล็ดกาแฟที่ใช้</label>
        <select id="cb-bean" onchange="calcColdBrew()">${beanOpts}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>ปริมาณเมล็ดที่ใช้ (g)</label>
          <input type="number" id="cb-grams" value="100" min="1" oninput="calcColdBrew()">
        </div>
        <div class="form-group">
          <label>ต้นทุนเมล็ด/g (฿)</label>
          <input type="number" id="cb-cpg" value="" step="0.01" min="0" oninput="calcColdBrew()" placeholder="ดึงจากเมล็ดอัตโนมัติ">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>น้ำกาแฟหลังกรอง (ml)</label>
          <input type="number" id="cb-liquid" value="800" min="1" oninput="calcColdBrew()">
        </div>
        <div class="form-group">
          <label>ขนาดขวดที่ขาย (ml)</label>
          <input type="number" id="cb-bottle" value="225" min="1" oninput="calcColdBrew()">
        </div>
      </div>

      <div class="calc-result-box" id="cb-result" style="
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 16px;
        margin-top: 12px;
        min-height: 80px;
      ">
        <div class="text-muted" style="font-size:0.85rem">กรอกข้อมูลด้านบนเพื่อคำนวณ...</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" id="cb-save-btn" onclick="saveColdBrewCost()" style="display:none">💾 บันทึก</button>
      <button class="btn btn-outline" onclick="closeModal();viewColdBrewHistory()">📋 ดูประวัติ</button>
      <button class="btn btn-ghost" onclick="closeModal()">ปิด</button>
    </div>
  </div>`);

  calcColdBrew();

  // Mark cpg field as user-edited if they type in it manually
  setTimeout(() => {
    const cpgEl = document.getElementById('cb-cpg');
    if (cpgEl) cpgEl.addEventListener('input', () => { cpgEl._userEdited = true; });
  }, 50);
}

function calcColdBrew() {
  const beanSel = document.getElementById('cb-bean');
  const gramsEl = document.getElementById('cb-grams');
  const cpgEl = document.getElementById('cb-cpg');
  const liquidEl = document.getElementById('cb-liquid');
  const bottleEl = document.getElementById('cb-bottle');
  const resultEl = document.getElementById('cb-result');
  const saveBtn = document.getElementById('cb-save-btn');
  if (!resultEl) return;

  // Auto-fill cost/g from selected bean
  if (beanSel && beanSel.value) {
    const opt = beanSel.options[beanSel.selectedIndex];
    const autoCpg = opt.dataset.cpg;
    if (autoCpg && !cpgEl._userEdited) {
      cpgEl.value = autoCpg;
    }
  }

  const grams = parseFloat(gramsEl?.value) || 0;
  const cpg = parseFloat(cpgEl?.value) || 0;
  const liquid = parseFloat(liquidEl?.value) || 0;
  const bottle = parseFloat(bottleEl?.value) || 0;

  if (grams <= 0 || liquid <= 0 || bottle <= 0) {
    resultEl.innerHTML = '<div class="text-muted" style="font-size:0.85rem">กรอกข้อมูลให้ครบถ้วนเพื่อคำนวณ</div>';
    if (saveBtn) saveBtn.style.display = 'none';
    return;
  }

  const bottles = Math.floor(liquid / bottle);
  if (bottles === 0) {
    resultEl.innerHTML = '<div class="text-red" style="font-size:0.85rem">⚠️ ปริมาณน้ำกาแฟน้อยกว่าขนาดขวด ได้ 0 ขวด</div>';
    if (saveBtn) saveBtn.style.display = 'none';
    return;
  }

  const beanCost = grams * cpg;
  const costPerBottle = beanCost / bottles;
  const leftoverMl = liquid - (bottles * bottle);

  resultEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <div class="text-muted" style="font-size:0.72rem;margin-bottom:2px">จำนวนขวดที่ได้</div>
        <div style="font-size:1.6rem;font-weight:700;color:var(--accent)">${bottles} <span style="font-size:0.9rem;font-weight:400">ขวด</span></div>
      </div>
      <div>
        <div class="text-muted" style="font-size:0.72rem;margin-bottom:2px">ต้นทุนต่อขวด</div>
        <div style="font-size:1.6rem;font-weight:700;color:var(--green)">฿${costPerBottle.toFixed(2)}</div>
      </div>
    </div>
    <div style="font-size:0.78rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:8px;display:flex;flex-wrap:wrap;gap:12px">
      <span>🫘 ต้นทุนเมล็ด: <strong>฿${beanCost.toFixed(2)}</strong></span>
      <span>🧊 น้ำหลังกรอง: <strong>${liquid} ml</strong></span>
      <span>🍶 ขนาดขวด: <strong>${bottle} ml</strong></span>
      ${leftoverMl > 0 ? `<span class="text-muted">เหลือ ${leftoverMl} ml (ไม่ครบขวด)</span>` : ''}
    </div>
  `;

  if (saveBtn) {
    saveBtn.style.display = '';
    saveBtn.dataset.cost = costPerBottle.toFixed(2);
    // เก็บข้อมูลครบสำหรับบันทึก history
    const beanSel2 = document.getElementById('cb-bean');
    const beanName = beanSel2?.options[beanSel2.selectedIndex]?.text?.split(' (')[0] || '—';
    saveBtn.dataset.snapshot = JSON.stringify({
      beanId: beanSel2?.value || '',
      beanName,
      grams,
      cpg,
      liquidMl: liquid,
      bottleMl: bottle,
      bottles,
      beanCost: parseFloat(beanCost.toFixed(2)),
      costPerBottle: parseFloat(costPerBottle.toFixed(2)),
    });
  }
}

async function saveColdBrewCost() {
  const saveBtn = document.getElementById('cb-save-btn');
  const cost = parseFloat(saveBtn?.dataset.cost);
  if (!cost || isNaN(cost)) return;

  const snapshot = saveBtn.dataset.snapshot ? JSON.parse(saveBtn.dataset.snapshot) : {};
  const entry = {
    ...snapshot,
    date: todayISO(),
    savedAt: new Date().toISOString(),
  };

  const settings = await get('settings', 'main') || {};
  const history = Array.isArray(settings.coldBrewHistory) ? settings.coldBrewHistory : [];
  history.push(entry);

  await update('settings', { ...settings, id: 'main', coldBrewCostPerBottle: cost, coldBrewHistory: history });
  appSettings = await get('settings', 'main');

  showToast(`✅ บันทึกต้นทุน Cold Brew ฿${cost.toFixed(2)}/ขวด แล้ว`);
  closeModal();
}

async function viewColdBrewHistory() {
  const settings = await get('settings', 'main') || {};
  const history = [...(settings.coldBrewHistory || [])].reverse(); // ใหม่ก่อน

  openModal(`<div class="modal modal-lg">
    <div class="modal-header">
      <h3>📋 ประวัติต้นทุน Cold Brew</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      ${history.length === 0
        ? '<p class="text-muted">ยังไม่มีประวัติ — กด "💾 บันทึก" ในเครื่องคิดเลขเพื่อเริ่มเก็บ</p>'
        : `<div class="table-wrap">
            <table>
              <thead><tr>
                <th>วันที่</th>
                <th>เมล็ด</th>
                <th>เมล็ด (g)</th>
                <th>น้ำหลังกรอง</th>
                <th>ขนาดขวด</th>
                <th>จำนวนขวด</th>
                <th>ต้นทุน/g</th>
                <th>ต้นทุน/ขวด</th>
              </tr></thead>
              <tbody>
                ${history.map((h, i) => `
                  <tr${i === 0 ? ' style="background:rgba(200,149,108,0.08)"' : ''}>
                    <td>${formatDate(h.date)}${i === 0 ? ' <span class="badge badge-accent" style="font-size:0.6rem">ล่าสุด</span>' : ''}</td>
                    <td>${escHtml(h.beanName || '—')}</td>
                    <td>${h.grams}g</td>
                    <td>${h.liquidMl} ml</td>
                    <td>${h.bottleMl} ml</td>
                    <td class="text-accent fw-bold">${h.bottles} ขวด</td>
                    <td class="muted">${h.cpg ? h.cpg.toFixed(2) + '฿' : '—'}</td>
                    <td class="money-green fw-bold">฿${h.costPerBottle?.toFixed(2) || '—'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top:12px;font-size:0.78rem;color:var(--text-muted)">
            รวม ${history.length} ครั้ง |
            ต้นทุน/ขวด ต่ำสุด: <span class="text-green">฿${Math.min(...history.map(h => h.costPerBottle || 0)).toFixed(2)}</span> |
            สูงสุด: <span class="text-red">฿${Math.max(...history.map(h => h.costPerBottle || 0)).toFixed(2)}</span>
          </div>`
      }
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal();openColdBrewCalcModal()">🧮 คำนวณใหม่</button>
      <button class="btn btn-ghost" onclick="closeModal()">ปิด</button>
    </div>
  </div>`);
}

// ===== SALES =====
async function renderSales() {
  const [allSales, allBeans, allCustomers] = await Promise.all([
    getAll('sales'), getAll('beans'), getAll('customers'),
  ]);

  const today = todayISO();
  let filtered = [...allSales].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  if (salesFilter === 'today') filtered = filtered.filter(s => s.date === today);
  else if (salesFilter === 'date' && salesFilterDate) filtered = filtered.filter(s => s.date === salesFilterDate);

  const todaySales = allSales.filter(s => s.date === today);
  const todayRev = todaySales.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const todayProd = PRODUCTS.map(p => ({ ...p, qty: todaySales.filter(s => s.product === p.key).reduce((sum, s) => sum + s.quantity, 0) })).filter(p => p.qty > 0);

  const custMap = Object.fromEntries(allCustomers.map(c => [c.id, c.name]));
  const beanMap = Object.fromEntries(allBeans.map(b => [b.id, b.name]));

  const getProductLabel = key => PRODUCTS.find(p => p.key === key)?.label || key;

  document.getElementById('tab-sales').innerHTML = `
    <div class="page-header">
      <div class="page-title">💰 การขาย</div>
    </div>

    <div class="product-btns">
      ${PRODUCTS.map(p => `<button class="btn btn-outline" onclick="openSaleModal('${p.key}')">${p.icon} ${p.label}</button>`).join('')}
      <button class="btn btn-ghost" onclick="openColdBrewCalcModal()" style="border-style:dashed;color:var(--text-muted)">🧮 คำนวณต้นทุน Cold Brew</button>
    </div>

    <div class="dash-section mb-12">
      <div class="dash-section-title">สรุปวันนี้</div>
      <div style="font-size:1.3rem;font-weight:700;color:var(--accent);margin-bottom:4px">฿${formatMoney(todayRev)}</div>
      <div class="text-muted" style="font-size:0.8rem;margin-bottom:8px">${todaySales.length} รายการ</div>
      ${todayProd.map(p => `<div class="product-row"><span class="product-icon">${p.icon}</span><span class="product-name">${p.label}</span><span class="product-qty">${p.qty} ชิ้น</span></div>`).join('')}
      ${todayProd.length === 0 ? '<div class="text-muted" style="font-size:0.82rem">ยังไม่มีรายการวันนี้</div>' : ''}
    </div>

    <div class="filter-bar">
      <button class="filter-btn${salesFilter === 'all' ? ' active' : ''}" onclick="setSalesFilter('all')">ทั้งหมด</button>
      <button class="filter-btn${salesFilter === 'today' ? ' active' : ''}" onclick="setSalesFilter('today')">วันนี้</button>
      <input type="date" class="filter-btn" id="sales-date-filter" value="${salesFilterDate || ''}" onchange="setSalesFilter('date', this.value)" style="cursor:pointer">
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>วันที่</th><th>สินค้า</th><th>จำนวน</th><th>ราคา</th><th>รวม</th>
          <th>ต้นทุน</th><th>กำไร</th><th>ช่องทาง</th><th>ลูกค้า</th><th></th>
        </tr></thead>
        <tbody>
          ${filtered.length === 0 ? '<tr class="empty-row"><td colspan="10">ยังไม่มีข้อมูลการขาย — กดปุ่ม + บันทึกขาย เพื่อเริ่มต้น</td></tr>' : ''}
          ${filtered.map(s => {
            const total = s.price * s.quantity;
            const costTotal = s.cost * s.quantity;
            const profit = total - costTotal;
            return `<tr>
              <td>${formatDate(s.date)}</td>
              <td>${getProductLabel(s.product)}</td>
              <td>${s.quantity}</td>
              <td>฿${formatMoney(s.price)}</td>
              <td class="money-green">฿${formatMoney(total)}</td>
              <td class="muted">฿${formatMoney(costTotal)}</td>
              <td class="${profit >= 0 ? 'money-green' : 'money-red'}">฿${formatMoney(profit)}</td>
              <td class="muted">${escHtml(s.channel || '—')}</td>
              <td class="muted">${s.customerId ? escHtml(custMap[s.customerId] || '—') : '—'}</td>
              <td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteSale('${s.id}')">🗑️</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setSalesFilter(type, date) {
  salesFilter = type;
  if (type === 'date') salesFilterDate = date || null;
  renderSales();
}

async function openSaleModal(productKey) {
  const [allBeans, allCustomers] = await Promise.all([getAll('beans'), getAll('customers')]);
  const activeBeans = allBeans.filter(b => b.active && b.quantity_g > 0);
  const s = appSettings || {};

  const getPriceForProduct = key => {
    const map = { cold_brew: s.coldBrewPrice, drip_hot: s.dripHotPrice, drip_iced: s.dripIcedPrice, latte: s.lattePrice };
    return map[key] || 0;
  };

  const getCostForProduct = key => {
    const map = { cold_brew: s.coldBrewCostPerBottle, drip_hot: s.dripCostPerCup, drip_iced: s.dripCostPerCup, latte: s.latteCostPerCup };
    return map[key] || 0;
  };

  const prodOpts = PRODUCTS.map(p => `<option value="${p.key}"${p.key === productKey ? ' selected' : ''}>${p.icon} ${p.label}</option>`).join('');
  const beanOpts = `<option value="">— ไม่ระบุ —</option>` + activeBeans.map(b => `<option value="${b.id}">${escHtml(b.name)} (${b.quantity_g}g)</option>`).join('');
  const custOpts = `<option value="">— ไม่ระบุ —</option><option value="__new__">+ เพิ่มลูกค้าใหม่</option>` + allCustomers.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
  const chanOpts = CHANNELS.map(c => `<option value="${c}">${c}</option>`).join('');
  const selProd = PRODUCTS.find(p => p.key === productKey);

  openModal(`<div class="modal">
    <div class="modal-header">
      <h3>บันทึกการขาย</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>วันที่</label>
          <input type="date" id="sl-date" value="${todayISO()}"></div>
        <div class="form-group"><label>สินค้า</label>
          <select id="sl-product" onchange="onSaleProductChange()">${prodOpts}</select></div>
      </div>
      <div class="form-group"><label>เมล็ดที่ใช้ (ระบุเพื่อหักสต็อกอัตโนมัติ)</label>
        <select id="sl-bean">${beanOpts}</select></div>
      <div class="form-group"><label>ลูกค้า</label>
        <select id="sl-customer" onchange="onSaleCustomerChange()">${custOpts}</select>
        <div class="quick-customer-form" id="quick-cust-form">
          <div class="form-row">
            <div class="form-group"><label>ชื่อ *</label><input type="text" id="qc-name" placeholder="ชื่อลูกค้า"></div>
            <div class="form-group"><label>เบอร์โทร</label><input type="text" id="qc-phone" placeholder="08x-xxx-xxxx"></div>
          </div>
          <div class="form-group"><label>LINE ID</label><input type="text" id="qc-line"></div>
          <button class="btn btn-primary btn-sm" onclick="saveQuickCustomer()">+ เพิ่มลูกค้า</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>จำนวน</label>
          <input type="number" id="sl-qty" value="1" min="1" oninput="updateSaleSummary()"></div>
        <div class="form-group"><label>ช่องทาง</label>
          <select id="sl-channel">${chanOpts}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ราคาขาย (฿)</label>
          <input type="number" id="sl-price" value="${getPriceForProduct(productKey)}" oninput="updateSaleSummary()"></div>
        <div class="form-group"><label>ต้นทุน (฿)</label>
          <input type="number" id="sl-cost" value="${getCostForProduct(productKey)}" oninput="updateSaleSummary()"></div>
      </div>
      <div class="form-group"><label>หมายเหตุ</label><input type="text" id="sl-note" placeholder="บันทึกเพิ่มเติม"></div>
      <div class="form-summary" id="sale-summary">
        <div class="form-summary-row"><span>รายได้</span><span id="ss-rev">—</span></div>
        <div class="form-summary-row"><span>ต้นทุน</span><span id="ss-cost">—</span></div>
        <div class="form-summary-row form-summary-total"><span>กำไร</span><span id="ss-profit">—</span></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="saveSale()">💾 บันทึกการขาย</button>
    </div>
  </div>`);
  updateSaleSummary();
}

function onSaleProductChange() {
  const key = document.getElementById('sl-product').value;
  const s = appSettings || {};
  const prices = { cold_brew: [s.coldBrewPrice, s.coldBrewCostPerBottle], drip_hot: [s.dripHotPrice, s.dripCostPerCup], drip_iced: [s.dripIcedPrice, s.dripCostPerCup], latte: [s.lattePrice, s.latteCostPerCup] };
  const [price, cost] = prices[key] || [0, 0];
  document.getElementById('sl-price').value = price;
  document.getElementById('sl-cost').value = cost;
  updateSaleSummary();
}

function updateSaleSummary() {
  const qty = parseFloat(document.getElementById('sl-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('sl-price')?.value) || 0;
  const cost = parseFloat(document.getElementById('sl-cost')?.value) || 0;
  const rev = price * qty;
  const costTotal = cost * qty;
  const profit = rev - costTotal;
  document.getElementById('ss-rev').textContent = `฿${formatMoney(rev)}`;
  document.getElementById('ss-cost').textContent = `฿${formatMoney(costTotal)}`;
  document.getElementById('ss-profit').textContent = `฿${formatMoney(profit)}`;
}

function onSaleCustomerChange() {
  const val = document.getElementById('sl-customer').value;
  const form = document.getElementById('quick-cust-form');
  form.classList.toggle('show', val === '__new__');
}

async function saveQuickCustomer() {
  const name = document.getElementById('qc-name').value.trim();
  if (!name) { showToast('⚠️ ระบุชื่อลูกค้า'); return; }
  const cust = await add('customers', {
    name,
    phone: document.getElementById('qc-phone').value.trim(),
    lineId: document.getElementById('qc-line').value.trim(),
    channel: 'อื่นๆ',
    notes: '',
    tags: [],
    firstOrderDate: todayISO(),
  });

  // Refresh customer dropdown
  const allCustomers = await getAll('customers');
  const sel = document.getElementById('sl-customer');
  sel.innerHTML = `<option value="">— ไม่ระบุ —</option><option value="__new__">+ เพิ่มลูกค้าใหม่</option>` +
    allCustomers.map(c => `<option value="${c.id}"${c.id === cust.id ? ' selected' : ''}>${escHtml(c.name)}</option>`).join('');
  document.getElementById('quick-cust-form').classList.remove('show');
  showToast(`✅ เพิ่ม ${name} แล้ว`);
}

async function saveSale() {
  const product = document.getElementById('sl-product').value;
  const date = document.getElementById('sl-date').value;
  const qty = parseFloat(document.getElementById('sl-qty').value) || 0;
  const price = parseFloat(document.getElementById('sl-price').value) || 0;
  const cost = parseFloat(document.getElementById('sl-cost').value) || 0;
  const beanId = document.getElementById('sl-bean').value;
  const customerId = document.getElementById('sl-customer').value;
  const channel = document.getElementById('sl-channel').value;
  const note = document.getElementById('sl-note').value.trim();

  if (!date || qty <= 0) { showToast('⚠️ ระบุวันที่และจำนวน'); return; }
  if (customerId === '__new__') { showToast('⚠️ กรุณาบันทึกลูกค้าก่อน'); return; }

  await add('sales', {
    product, date, quantity: qty, price, cost, beanId: beanId || null,
    customerId: customerId || null, channel, note,
  });

  // Deduct bean stock
  if (beanId) {
    const prodData = PRODUCTS.find(p => p.key === product);
    const deductG = (prodData?.gramsPerUnit || 20) * qty;
    const bean = await get('beans', beanId);
    if (bean) {
      await update('beans', { ...bean, quantity_g: Math.max(0, bean.quantity_g - deductG) });
    }
  }

  closeModal();
  showToast('✅ บันทึกการขายแล้ว');
  await renderSales();
}

async function deleteSale(id) {
  if (!confirm('ลบรายการขายนี้?')) return;
  if (!await requireAdmin()) return;
  try {
    await remove('sales', id);
    showToast('ลบแล้ว');
    await renderSales();
  } catch(e) { if (!handleAdminError(e)) throw e; }
}

// ===== CUSTOMERS =====
async function renderCustomers() {
  const [customers, allSales] = await Promise.all([getAll('customers'), getAll('sales')]);

  const enriched = customers.map(c => {
    const cs = allSales.filter(s => s.customerId === c.id);
    const totalOrders = cs.length;
    const totalSpent = cs.reduce((sum, s) => sum + s.price * s.quantity, 0);
    return { ...c, totalOrders, totalSpent };
  }).sort((a, b) => {
    const la = allSales.filter(s => s.customerId === a.id).sort((x, y) => y.date.localeCompare(x.date))[0]?.date || '';
    const lb = allSales.filter(s => s.customerId === b.id).sort((x, y) => y.date.localeCompare(x.date))[0]?.date || '';
    return lb.localeCompare(la);
  });

  const filtered = customerSearch
    ? enriched.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : enriched;

  document.getElementById('tab-customers').innerHTML = `
    <div class="page-header">
      <div class="page-title">👥 ลูกค้า</div>
      <div class="page-actions">
        <input type="text" class="search-input" placeholder="🔍 ค้นหาชื่อลูกค้า..." value="${escHtml(customerSearch)}" oninput="customerSearch=this.value;renderCustomers()">
        <button class="btn btn-primary" onclick="openCustomerModal()">+ เพิ่มลูกค้า</button>
      </div>
    </div>

    ${filtered.length === 0 ? `<div style="text-align:center;padding:60px;color:var(--text-muted)">ยังไม่มีลูกค้า — กด "+ เพิ่มลูกค้า" เพื่อเริ่มต้น</div>` : ''}

    <div class="customer-grid">
      ${filtered.map(c => {
        const chanBadge = c.channel ? `<span class="badge badge-blue">${escHtml(c.channel)}</span>` : '';
        const tags = (c.tags || []).map(t => `<span class="badge badge-accent">${escHtml(t)}</span>`).join('');
        return `<div class="customer-card">
          <div class="cc-name">${escHtml(c.name)}</div>
          <div class="cc-channel">${chanBadge}</div>
          <div class="cc-contact">${c.phone ? `📞 ${escHtml(c.phone)}` : ''} ${c.lineId ? `| LINE: ${escHtml(c.lineId)}` : ''}</div>
          <div class="cc-stats">สั่งมาแล้ว: <span>${c.totalOrders} ครั้ง</span> | รวม <span>฿${formatMoney(c.totalSpent)}</span></div>
          ${tags ? `<div class="cc-tags">${tags}</div>` : ''}
          ${c.notes ? `<div class="cc-notes">${escHtml(c.notes)}</div>` : ''}
          <div class="cc-footer">
            <button class="btn btn-ghost btn-sm" onclick="viewCustomerHistory('${c.id}')">ดูประวัติ</button>
            <button class="btn btn-outline btn-sm" onclick="openCustomerModal('${c.id}')">แก้ไข</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">ลบ</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function openCustomerModal(id) {
  const chanOpts = (val) => CUSTOMER_CHANNELS.map(c => `<option value="${c}"${c === val ? ' selected' : ''}>${c}</option>`).join('');

  if (id) {
    getAll('customers').then(custs => {
      const c = custs.find(x => x.id === id);
      _showCustomerModal(c);
    });
  } else {
    _showCustomerModal(null);
  }
}

function _showCustomerModal(c) {
  const isEdit = !!c;
  const chanOpts = CUSTOMER_CHANNELS.map(ch => `<option value="${ch}"${ch === c?.channel ? ' selected' : ''}>${ch}</option>`).join('');
  const tagsJson = JSON.stringify(c?.tags || []);

  openModal(`<div class="modal">
    <div class="modal-header">
      <h3>${isEdit ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>ชื่อ *</label>
        <input type="text" id="cu-name" value="${escHtml(c?.name || '')}" placeholder="ชื่อลูกค้า"></div>
      <div class="form-row">
        <div class="form-group"><label>เบอร์โทร</label>
          <input type="text" id="cu-phone" value="${escHtml(c?.phone || '')}" placeholder="08x-xxx-xxxx"></div>
        <div class="form-group"><label>LINE ID</label>
          <input type="text" id="cu-line" value="${escHtml(c?.lineId || '')}"></div>
      </div>
      <div class="form-group"><label>ช่องทางที่รู้จัก</label>
        <select id="cu-channel">${chanOpts}</select></div>
      <div class="form-group"><label>หมายเหตุ</label>
        <input type="text" id="cu-notes" value="${escHtml(c?.notes || '')}" placeholder="เช่น ชอบเปรี้ยว ไม่ชอบขม"></div>
      <div class="form-group">
        <label>Tags (กด Enter หรือ , เพื่อเพิ่ม)</label>
        <div class="tags-input-wrap" id="tags-wrap" onclick="document.getElementById('cu-tag-input').focus()">
          <span id="tag-chips"></span>
          <input type="text" id="cu-tag-input" class="tags-input" placeholder="พิมพ์ tag..." onkeydown="handleTagInput(event)">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="saveCustomer('${c?.id || ''}')">💾 บันทึก</button>
    </div>
  </div>`);

  window._tags = c?.tags ? [...c.tags] : [];
  renderTagChips();
}

function renderTagChips() {
  const chips = document.getElementById('tag-chips');
  if (!chips) return;
  chips.innerHTML = (window._tags || []).map((t, i) =>
    `<span class="tag-chip">${escHtml(t)}<button type="button" onclick="removeTag(${i})">×</button></span>`
  ).join('');
}

function removeTag(i) {
  window._tags.splice(i, 1);
  renderTagChips();
}

function handleTagInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/,$/, '');
    if (val && !(window._tags || []).includes(val)) {
      window._tags = [...(window._tags || []), val];
      renderTagChips();
    }
    e.target.value = '';
  }
}

async function saveCustomer(id) {
  const name = document.getElementById('cu-name').value.trim();
  if (!name) { showToast('⚠️ กรุณาระบุชื่อ'); return; }

  const data = {
    name,
    phone: document.getElementById('cu-phone').value.trim(),
    lineId: document.getElementById('cu-line').value.trim(),
    channel: document.getElementById('cu-channel').value,
    notes: document.getElementById('cu-notes').value.trim(),
    tags: window._tags || [],
    firstOrderDate: id ? undefined : todayISO(),
  };

  if (id) await update('customers', { ...data, id });
  else await add('customers', data);

  closeModal();
  showToast('✅ บันทึกเรียบร้อย');
  await renderCustomers();
}

async function deleteCustomer(id) {
  if (!confirm('ลบลูกค้านี้?')) return;
  if (!await requireAdmin()) return;
  try {
    await remove('customers', id);
    showToast('ลบแล้ว');
    await renderCustomers();
  } catch(e) { if (!handleAdminError(e)) throw e; }
}

async function viewCustomerHistory(id) {
  const [allCustomers, allSales] = await Promise.all([getAll('customers'), getAll('sales')]);
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;

  const cs = allSales.filter(s => s.customerId === id).sort((a, b) => b.date.localeCompare(a.date));
  const totalOrders = cs.length;
  const totalSpent = cs.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const lastOrder = cs[0]?.date;

  const prodCount = {};
  cs.forEach(s => { prodCount[s.product] = (prodCount[s.product] || 0) + s.quantity; });
  const favKey = Object.entries(prodCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const favProd = favKey ? PRODUCTS.find(p => p.key === favKey)?.label : '—';

  const getProductLabel = key => PRODUCTS.find(p => p.key === key)?.label || key;

  openModal(`<div class="modal modal-lg">
    <div class="modal-header">
      <h3>ประวัติลูกค้า — ${escHtml(c.name)}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="history-stats">
        <div class="hs-item"><div class="hs-val">${totalOrders}</div><div class="hs-lbl">Order ทั้งหมด</div></div>
        <div class="hs-item"><div class="hs-val">฿${formatMoney(totalSpent)}</div><div class="hs-lbl">ยอดใช้จ่ายรวม</div></div>
        <div class="hs-item"><div class="hs-val">${escHtml(favProd)}</div><div class="hs-lbl">เมนูที่สั่งบ่อย</div></div>
        <div class="hs-item"><div class="hs-val">${lastOrder ? formatDateShort(lastOrder) : '—'}</div><div class="hs-lbl">สั่งล่าสุด</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>วันที่</th><th>สินค้า</th><th>จำนวน</th><th>ราคา</th></tr></thead>
          <tbody>
            ${cs.length === 0 ? '<tr class="empty-row"><td colspan="4">ยังไม่มีประวัติ</td></tr>' : ''}
            ${cs.map(s => `<tr>
              <td>${formatDate(s.date)}</td>
              <td>${getProductLabel(s.product)}</td>
              <td>${s.quantity}</td>
              <td class="money-green">฿${formatMoney(s.price * s.quantity)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">ปิด</button>
    </div>
  </div>`);
}

// ===== SUPPLIES =====
async function renderSupplies() {
  const supplies = await getAll('supplies');

  const grouped = {};
  SUPPLY_CATS.forEach(cat => { grouped[cat] = []; });
  supplies.forEach(s => {
    const cat = SUPPLY_CATS.includes(s.category) ? s.category : 'อื่นๆ';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  const renderCard = s => `<div class="supply-card${s.quantity <= s.reorderLevel ? ' low-stock' : ''}">
    <div class="flex-between mb-12">
      <div class="sc-name">${escHtml(s.name)}</div>
      ${s.quantity <= s.reorderLevel ? `<span class="badge badge-red">สั่งเพิ่ม!</span>` : ''}
    </div>
    <div class="sc-qty-row">
      <div class="sc-qty">${s.quantity}</div>
      <div class="sc-unit">${escHtml(s.unit)}</div>
    </div>
    <div class="sc-reorder">min ${s.reorderLevel} ${escHtml(s.unit)} | ฿${s.costPerUnit}/${escHtml(s.unit)}</div>
    <div class="sc-footer">
      <button class="btn btn-outline btn-sm" onclick="adjustSupply('${s.id}', ${s.quantity}, '${escHtml(s.unit)}', 1)">+ เติม</button>
      <button class="btn btn-ghost btn-sm" onclick="adjustSupply('${s.id}', ${s.quantity}, '${escHtml(s.unit)}', -1)">- ใช้</button>
      <button class="btn btn-ghost btn-sm" onclick="openSupplyModal('${s.id}')">แก้ไข</button>
      <button class="btn btn-danger btn-sm btn-icon" onclick="deleteSupply('${s.id}')">🗑️</button>
    </div>
  </div>`;

  document.getElementById('tab-supplies').innerHTML = `
    <div class="page-header">
      <div class="page-title">📦 สิ้นเปลือง</div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openSupplyModal()">+ เพิ่มรายการ</button>
      </div>
    </div>

    ${supplies.length === 0 ? `<div style="text-align:center;padding:60px;color:var(--text-muted)">ยังไม่มีข้อมูล</div>` : ''}

    ${SUPPLY_CATS.map(cat => {
      const items = grouped[cat];
      if (!items || items.length === 0) return '';
      return `<div class="supplies-section">
        <div class="supplies-category-title">${cat}</div>
        <div class="supply-grid">${items.map(renderCard).join('')}</div>
      </div>`;
    }).join('')}
  `;
}

function adjustSupply(id, currentQty, unit, dir) {
  const action = dir > 0 ? 'เติม' : 'ใช้';
  openModal(`<div class="modal">
    <div class="modal-header">
      <h3>${action}สต็อก</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p class="text-muted mb-12">คงเหลือ: <strong>${currentQty} ${unit}</strong></p>
      <div class="form-group"><label>จำนวนที่${action} (${unit})</label>
        <input type="number" id="adj-qty" min="1" placeholder="0"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="doAdjustSupply('${id}', ${currentQty}, ${dir})">ยืนยัน</button>
    </div>
  </div>`);
}

async function doAdjustSupply(id, currentQty, dir) {
  const qty = parseFloat(document.getElementById('adj-qty').value) || 0;
  if (qty <= 0) { showToast('⚠️ ระบุจำนวน'); return; }
  const newQty = Math.max(0, currentQty + dir * qty);
  const supply = await get('supplies', id);
  await update('supplies', { ...supply, quantity: newQty });
  closeModal();
  showToast(`✅ อัปเดตแล้ว: ${newQty} ${supply.unit}`);
  await renderSupplies();
}

function openSupplyModal(id) {
  if (id) {
    getAll('supplies').then(all => {
      const s = all.find(x => x.id === id);
      _showSupplyModal(s);
    });
  } else {
    _showSupplyModal(null);
  }
}

function _showSupplyModal(s) {
  const catOpts = SUPPLY_CATS.map(c => `<option value="${c}"${c === s?.category ? ' selected' : ''}>${c}</option>`).join('');
  openModal(`<div class="modal">
    <div class="modal-header">
      <h3>${s ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>ชื่อ *</label>
        <input type="text" id="sp-name" value="${escHtml(s?.name || '')}" placeholder="ชื่อรายการ"></div>
      <div class="form-row">
        <div class="form-group"><label>หมวด</label>
          <select id="sp-cat">${catOpts}</select></div>
        <div class="form-group"><label>หน่วย</label>
          <input type="text" id="sp-unit" value="${escHtml(s?.unit || '')}" placeholder="เช่น ใบ, แผ่น"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>จำนวน</label>
          <input type="number" id="sp-qty" value="${s?.quantity || 0}" min="0"></div>
        <div class="form-group"><label>ราคา/หน่วย (฿)</label>
          <input type="number" id="sp-cost" value="${s?.costPerUnit || 0}" min="0" step="0.01"></div>
      </div>
      <div class="form-group"><label>จุดสั่งเพิ่ม (reorder level)</label>
        <input type="number" id="sp-reorder" value="${s?.reorderLevel || 0}" min="0"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="saveSupply('${s?.id || ''}')">💾 บันทึก</button>
    </div>
  </div>`);
}

async function saveSupply(id) {
  const name = document.getElementById('sp-name').value.trim();
  if (!name) { showToast('⚠️ ระบุชื่อ'); return; }
  const data = {
    name,
    category: document.getElementById('sp-cat').value,
    unit: document.getElementById('sp-unit').value.trim(),
    quantity: parseFloat(document.getElementById('sp-qty').value) || 0,
    costPerUnit: parseFloat(document.getElementById('sp-cost').value) || 0,
    reorderLevel: parseFloat(document.getElementById('sp-reorder').value) || 0,
  };
  if (id) await update('supplies', { ...data, id });
  else await add('supplies', data);
  closeModal();
  showToast('✅ บันทึกเรียบร้อย');
  await renderSupplies();
}

async function deleteSupply(id) {
  if (!confirm('ลบรายการนี้?')) return;
  if (!await requireAdmin()) return;
  try {
    await remove('supplies', id);
    showToast('ลบแล้ว');
    await renderSupplies();
  } catch(e) { if (!handleAdminError(e)) throw e; }
}

// ===== EXPENSES =====
async function renderExpenses() {
  const expenses = await getAll('expenses');
  expenses.sort((a, b) => b.date.localeCompare(a.date));

  const thisMonth = thisMonthISO();
  const monthExp = expenses.filter(e => e.date.startsWith(thisMonth));
  const monthTotal = monthExp.reduce((sum, e) => sum + e.amount, 0);

  const byCat = {};
  monthExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `<div class="pnl-row"><span class="pnl-label">${escHtml(cat)}</span><span class="text-red">฿${formatMoney(amt)}</span></div>`).join('');

  const catOpts = EXPENSE_CATS.map(c => `<option value="${c}">${c}</option>`).join('');

  document.getElementById('tab-expenses').innerHTML = `
    <div class="page-header">
      <div class="page-title">🧾 รายจ่าย</div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openExpenseModal()">+ เพิ่มรายจ่าย</button>
      </div>
    </div>

    <div class="dash-section mb-12">
      <div class="dash-section-title">รายจ่ายเดือนนี้</div>
      <div style="font-size:1.3rem;font-weight:700;color:var(--red);margin-bottom:8px">฿${formatMoney(monthTotal)}</div>
      ${catRows || '<div class="text-muted" style="font-size:0.82rem">ยังไม่มีรายจ่ายเดือนนี้</div>'}
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>วันที่</th><th>หมวด</th><th>รายละเอียด</th><th>จำนวนเงิน</th><th></th></tr></thead>
        <tbody>
          ${expenses.length === 0 ? '<tr class="empty-row"><td colspan="5">ยังไม่มีรายจ่าย</td></tr>' : ''}
          ${expenses.map(e => `<tr>
            <td>${formatDate(e.date)}</td>
            <td><span class="badge badge-blue">${escHtml(e.category)}</span></td>
            <td>${escHtml(e.description)}</td>
            <td class="money-red">฿${formatMoney(e.amount)}</td>
            <td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteExpense('${e.id}')">🗑️</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function openExpenseModal() {
  const catOpts = EXPENSE_CATS.map(c => `<option value="${c}">${c}</option>`).join('');
  openModal(`<div class="modal">
    <div class="modal-header">
      <h3>เพิ่มรายจ่าย</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>วันที่</label>
          <input type="date" id="ex-date" value="${todayISO()}"></div>
        <div class="form-group"><label>หมวด</label>
          <select id="ex-cat">${catOpts}</select></div>
      </div>
      <div class="form-group"><label>รายละเอียด</label>
        <input type="text" id="ex-desc" placeholder="รายละเอียดรายจ่าย"></div>
      <div class="form-group"><label>จำนวนเงิน (฿)</label>
        <input type="number" id="ex-amount" min="0" placeholder="0"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="saveExpense()">💾 บันทึก</button>
    </div>
  </div>`);
}

async function saveExpense() {
  const date = document.getElementById('ex-date').value;
  const amount = parseFloat(document.getElementById('ex-amount').value) || 0;
  if (!date || amount <= 0) { showToast('⚠️ ระบุวันที่และจำนวนเงิน'); return; }
  await add('expenses', {
    date,
    category: document.getElementById('ex-cat').value,
    description: document.getElementById('ex-desc').value.trim(),
    amount,
  });
  closeModal();
  showToast('✅ บันทึกรายจ่ายแล้ว');
  await renderExpenses();
}

async function deleteExpense(id) {
  if (!confirm('ลบรายจ่ายนี้?')) return;
  if (!await requireAdmin()) return;
  try {
    await remove('expenses', id);
    showToast('ลบแล้ว');
    await renderExpenses();
  } catch(e) { if (!handleAdminError(e)) throw e; }
}

// ===== SETTINGS =====
async function renderSettings() {
  const [allBeans, allCustomers, allSales, allSupplies, allExpenses] = await Promise.all([
    getAll('beans'), getAll('customers'), getAll('sales'), getAll('supplies'), getAll('expenses'),
  ]);
  const s = appSettings || {};

  document.getElementById('tab-settings').innerHTML = `
    <div class="page-header"><div class="page-title">⚙️ ตั้งค่า</div></div>

    <div class="settings-section">
      <h3>ราคาสินค้า (ค่าเริ่มต้น)</h3>
      <div class="settings-grid-2">
        <div class="form-group"><label>Cold Brew ฿/ขวด</label>
          <input type="number" id="set-cb-price" value="${s.coldBrewPrice || 150}" min="0"></div>
        <div class="form-group"><label>Drip ร้อน ฿/แก้ว</label>
          <input type="number" id="set-drip-hot-price" value="${s.dripHotPrice || 120}" min="0"></div>
        <div class="form-group"><label>Japanese Iced ฿/แก้ว</label>
          <input type="number" id="set-drip-iced-price" value="${s.dripIcedPrice || 130}" min="0"></div>
        <div class="form-group"><label>กาแฟนม ฿/แก้ว</label>
          <input type="number" id="set-latte-price" value="${s.lattePrice || 80}" min="0"></div>
      </div>
    </div>

    <div class="settings-section">
      <h3>ต้นทุนสินค้า (ค่าเริ่มต้น)</h3>
      <div class="settings-grid-3">
        <div class="form-group"><label>Cold Brew ต้นทุน/ขวด</label>
          <input type="number" id="set-cb-cost" value="${s.coldBrewCostPerBottle || 55}" min="0"></div>
        <div class="form-group"><label>Drip ต้นทุน/แก้ว</label>
          <input type="number" id="set-drip-cost" value="${s.dripCostPerCup || 30}" min="0"></div>
        <div class="form-group"><label>กาแฟนม ต้นทุน/แก้ว</label>
          <input type="number" id="set-latte-cost" value="${s.latteCostPerCup || 25}" min="0"></div>
      </div>
    </div>

    <div class="settings-section">
      <h3>เป้าหมาย</h3>
      <div class="form-group"><label>เป้ารายได้/เดือน (฿)</label>
        <input type="number" id="set-target" value="${s.monthlyTarget || 50000}" min="0"></div>
      <button class="btn btn-primary" onclick="saveSettings()">💾 บันทึกการตั้งค่า</button>
    </div>

    <div class="settings-section">
      <h3>ข้อมูลระบบ</h3>
      <div class="db-stats">
        <div class="db-stat"><div class="db-stat-val">${allBeans.length}</div><div class="db-stat-lbl">เมล็ด</div></div>
        <div class="db-stat"><div class="db-stat-val">${allCustomers.length}</div><div class="db-stat-lbl">ลูกค้า</div></div>
        <div class="db-stat"><div class="db-stat-val">${allSales.length}</div><div class="db-stat-lbl">รายการขาย</div></div>
        <div class="db-stat"><div class="db-stat-val">${allSupplies.length}</div><div class="db-stat-lbl">สิ้นเปลือง</div></div>
        <div class="db-stat"><div class="db-stat-val">${allExpenses.length}</div><div class="db-stat-lbl">รายจ่าย</div></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="exportData()">📥 Export JSON</button>
        <button class="btn btn-outline" onclick="document.getElementById('import-file').click()">📤 Import JSON</button>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(this)">
        <button class="btn btn-danger" onclick="resetData()">🗑️ รีเซ็ตข้อมูลทั้งหมด</button>
      </div>
    </div>

    ${window.SERVER_MODE ? `
    <div class="settings-section">
      <h3>🔐 Admin</h3>
      <p class="text-muted" style="font-size:0.82rem;margin-bottom:10px">
        ${sessionStorage.getItem('adminPwd')
          ? '✅ Login อยู่ — password แคชไว้ใน session นี้'
          : '🔓 ยังไม่ได้ login — จะถูกถามเมื่อลบ/import/reset'}
      </p>
      <button class="btn btn-ghost" onclick="logoutAdmin();renderSettings()"
        style="font-size:0.85rem" ${!sessionStorage.getItem('adminPwd') ? 'disabled' : ''}>
        🔓 Logout admin
      </button>
    </div>` : ''}
  `;
}

async function saveSettings() {
  appSettings = {
    id: 'main',
    coldBrewPrice: parseFloat(document.getElementById('set-cb-price').value) || 0,
    dripHotPrice: parseFloat(document.getElementById('set-drip-hot-price').value) || 0,
    dripIcedPrice: parseFloat(document.getElementById('set-drip-iced-price').value) || 0,
    lattePrice: parseFloat(document.getElementById('set-latte-price').value) || 0,
    coldBrewCostPerBottle: parseFloat(document.getElementById('set-cb-cost').value) || 0,
    dripCostPerCup: parseFloat(document.getElementById('set-drip-cost').value) || 0,
    latteCostPerCup: parseFloat(document.getElementById('set-latte-cost').value) || 0,
    monthlyTarget: parseFloat(document.getElementById('set-target').value) || 0,
  };
  await update('settings', appSettings);
  showToast('บันทึกการตั้งค่าเรียบร้อย ✅');
}

async function exportData() {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `coffee-manager-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('📥 Export เรียบร้อย');
}

async function importData(input) {
  if (!input.files[0]) return;
  const text = await input.files[0].text();
  let data;
  try { data = JSON.parse(text); } catch { showToast('⚠️ ไฟล์ไม่ถูกต้อง'); return; }
  if (!confirm('Import จะ overwrite ข้อมูลทั้งหมด ยืนยัน?')) return;
  if (!await requireAdmin()) return;
  try {
    await importAllData(data);
    appSettings = await get('settings', 'main');
    showToast('📤 Import เรียบร้อย');
    await renderSettings();
  } catch(e) { if (!handleAdminError(e)) throw e; }
}

async function resetData() {
  if (!confirm('รีเซ็ตจะลบข้อมูลทั้งหมดและใส่ข้อมูลเริ่มต้นใหม่ ยืนยัน?')) return;
  if (!await requireAdmin()) return;
  try {
    await clearAllData();
    appSettings = await get('settings', 'main');
    showToast('✅ รีเซ็ตเรียบร้อย');
    await renderSettings();
  } catch(e) { if (!handleAdminError(e)) throw e; }
}

// ===== INIT =====
async function init() {
  await initDB();
  appSettings = await get('settings', 'main');

  renderNav();

  // Modal overlay click-outside to close
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  await switchTab('dashboard');

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
