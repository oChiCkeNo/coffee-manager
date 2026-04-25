# Coffee Manager PWA — Spec สำหรับ Claude Code

## สรุปโปรเจกต์

สร้าง **Progressive Web App (PWA)** สำหรับบริหารจัดการร้านกาแฟ Specialty Coffee แบบ home café ทำงาน **offline ได้ 100%** บน Android Tablet และ Desktop browser

ผู้ใช้: เจ้าของร้านกาแฟ home café คนเดียว ใช้บน Android Tablet เป็นหลัก

---

## Tech Stack

- **Vanilla HTML + CSS + JavaScript** (ไม่ใช้ React/framework — ให้เป็น single-page app ด้วย vanilla JS)
- **IndexedDB** สำหรับเก็บข้อมูลทั้งหมดใน browser (offline-first)
- **Service Worker** สำหรับ offline caching
- **Web App Manifest** สำหรับ install เป็น standalone app
- **Font**: Google Fonts — Sarabun (Thai) ต้อง cache สำหรับ offline ด้วย
- **ไม่ต้องมี backend server**

---

## โครงสร้างไฟล์

```
coffee-manager/
├── index.html          # Main HTML (single page)
├── style.css           # Global styles
├── app.js              # Main application logic
├── db.js               # IndexedDB wrapper (CRUD operations)
├── sw.js               # Service Worker
├── manifest.json       # PWA manifest
├── icons/
│   ├── icon-192.png    # App icon 192x192
│   └── icon-512.png    # App icon 512x512
└── README.md           # วิธี deploy ขึ้น GitHub Pages
```

---

## PWA Requirements

### manifest.json
```json
{
  "name": "Coffee Manager — ระบบบริหารร้านกาแฟ",
  "short_name": "Coffee Mgr",
  "description": "ระบบบริหารจัดการร้านกาแฟ Specialty Coffee",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#1a1410",
  "theme_color": "#c8956c",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (sw.js)
- Cache-first strategy สำหรับ static assets (HTML, CSS, JS, fonts, icons)
- ต้อง cache Google Fonts (Sarabun) สำหรับ offline
- มี version number เพื่อ update cache เมื่อ deploy ใหม่
- Activate event ต้องลบ old cache

### Icons
- สร้าง icon เป็นรูป ☕ (ถ้วยกาแฟ) บน background สี `#1a1410` ด้วย SVG แล้ว convert เป็น PNG
- หรือสร้างเป็น SVG icon ที่ manifest ชี้ไปใช้ได้เลย

---

## Design System

### Color Palette (Dark Theme — บังคับ)
```css
:root {
  --bg:           #1a1410;
  --card:         #241e18;
  --card-hover:   #2e2620;
  --border:       #3d3428;
  --text:         #e8ddd0;
  --text-muted:   #9c8e7c;
  --accent:       #c8956c;
  --accent-light: #e0b896;
  --green:        #6abf69;
  --red:          #e06060;
  --yellow:       #e0b050;
  --orange:       #e08840;
  --blue:         #6098c8;
}
```

### Typography
- Font family: `'Sarabun', 'Noto Sans Thai', sans-serif`
- Base size: 14px
- Headings: 700 weight
- Body: 400 weight
- Labels/muted: 12px, color `--text-muted`

### Components
- **Cards**: background `--card`, border 1px `--border`, border-radius 12px, padding 20px
- **Buttons primary**: background `--accent`, color white, border-radius 8px, padding 10px 20px, font-weight 600
- **Buttons outline**: transparent bg, border 1px `--accent`, color `--accent`
- **Buttons danger**: background `--red`, color white
- **Input/Select**: background `--bg`, color `--text`, border 1px `--border`, border-radius 8px, padding 8px 12px
- **Tags/Badges**: inline-block, background `{color}22` (22 = opacity), color `{color}`, border-radius 20px, padding 2px 10px, font-size 12px
- **Modal**: fixed overlay rgba(0,0,0,0.6), centered card max-width 500px, border-radius 16px, close button ✕ มุมขวาบน

### Responsive Layout
- **Desktop (≥768px)**: Sidebar ซ้าย 220px fixed, main content มี margin-left 220px
- **Mobile/Tablet (<768px)**: Bottom navigation bar fixed ที่ด้านล่าง, main content มี padding-bottom 80px
- ตรวจ `window.innerWidth` ตอน load + listen resize event

---

## IndexedDB Schema (db.js)

Database name: `CoffeeManagerDB`
Version: 1

### Object Stores

#### `beans` — เมล็ดกาแฟ
```
{
  id: string (auto-generated),
  name: string,              // ชื่อเมล็ด เช่น "Ethiopia Yirgacheffe Natural"
  origin: string,            // แหล่งปลูก เช่น "Ethiopia"
  process: string,           // "Natural" | "Washed" | "Honey" | "Lactic Fermentation" | "Anaerobic" | "Barrel Aged" | "อื่นๆ"
  roastLevel: string,        // "อ่อน" | "กลาง-อ่อน" | "กลาง" | "กลาง-เข้ม" | "เข้ม"
  roastDate: string,         // ISO date "2026-04-15"
  quantity_g: number,         // กรัมคงเหลือ
  cost_total: number,         // ราคาซื้อรวม (บาท)
  notes: string,
  active: boolean,
  createdAt: string,          // ISO datetime
  updatedAt: string
}
```
Index: `by-active` on `active`

#### `customers` — ลูกค้า (ฟีเจอร์ใหม่ CRM)
```
{
  id: string,
  name: string,              // ชื่อลูกค้า
  phone: string,             // เบอร์โทร (optional)
  lineId: string,            // LINE ID (optional)
  channel: string,           // ช่องทางที่รู้จักครั้งแรก "LINE OA" | "Instagram" | "TikTok" | "Walk-in" | "Grab" | "LINE MAN" | "อื่นๆ"
  notes: string,             // หมายเหตุ เช่น "ชอบเปรี้ยว ไม่ชอบขม"
  tags: string[],            // แท็ก เช่น ["ลูกค้าประจำ", "ชอบ fruity"]
  firstOrderDate: string,    // วันที่สั่งครั้งแรก
  totalOrders: number,       // จำนวน order ทั้งหมด (คำนวณจาก sales)
  totalSpent: number,        // ยอดใช้จ่ายรวม (คำนวณจาก sales)
  createdAt: string,
  updatedAt: string
}
```
Index: `by-name` on `name`

#### `sales` — รายการขาย
```
{
  id: string,
  date: string,              // ISO date
  product: string,           // "cold_brew" | "drip_hot" | "drip_iced" | "latte"
  beanId: string,            // อ้างอิง bean ที่ใช้ (optional — ถ้าระบุ จะหักสต็อกอัตโนมัติ)
  customerId: string,        // อ้างอิง customer (optional — ถ้าระบุ จะเชื่อมกับประวัติลูกค้า)
  quantity: number,
  price: number,             // ราคาขายต่อหน่วย
  cost: number,              // ต้นทุนต่อหน่วย
  channel: string,           // ช่องทาง
  note: string,
  createdAt: string
}
```
Indexes: `by-date` on `date`, `by-customer` on `customerId`, `by-product` on `product`

#### `supplies` — อุปกรณ์สิ้นเปลือง
```
{
  id: string,
  name: string,
  category: string,          // "บรรจุภัณฑ์" | "อุปกรณ์ชง" | "วัตถุดิบ" | "อื่นๆ"
  quantity: number,
  unit: string,              // "ใบ" | "แผ่น" | "อัน" | "ชิ้น" ฯลฯ
  costPerUnit: number,
  reorderLevel: number,      // จุดแจ้งเตือนสั่งเพิ่ม
  createdAt: string,
  updatedAt: string
}
```

#### `expenses` — รายจ่าย
```
{
  id: string,
  date: string,
  category: string,          // "วัตถุดิบ" | "บรรจุภัณฑ์" | "อุปกรณ์" | "ค่าส่ง" | "ค่าธรรมเนียม" | "การตลาด" | "ค่าน้ำ/ไฟ" | "อื่นๆ"
  description: string,
  amount: number,
  createdAt: string
}
```
Index: `by-date` on `date`

#### `settings` — ตั้งค่า (เก็บแค่ 1 record)
```
{
  id: "main",
  coldBrewPrice: 150,
  dripHotPrice: 120,
  dripIcedPrice: 130,
  lattePrice: 80,
  coldBrewCostPerBottle: 55,
  dripCostPerCup: 30,
  latteCostPerCup: 25,
  monthlyTarget: 50000
}
```

---

## Navigation Tabs

7 tabs (เพิ่ม "ลูกค้า" จากเดิม 6):

| Key | Label | Icon | ลำดับ |
|-----|-------|------|-------|
| dashboard | Dashboard | 📊 | 1 |
| beans | สต็อกเมล็ด | 🫘 | 2 |
| sales | การขาย | 💰 | 3 |
| customers | ลูกค้า | 👥 | 4 |
| supplies | สิ้นเปลือง | 📦 | 5 |
| expenses | รายจ่าย | 🧾 | 6 |
| settings | ตั้งค่า | ⚙️ | 7 |

**Desktop**: Sidebar ซ้าย แสดง icon + label ทุกตัว
**Mobile/Tablet**: Bottom bar แสดง icon + label ทุกตัว (ย่อ font-size ให้พอดี)

---

## หน้า 1: Dashboard

### ข้อมูลแสดง

**แถว Metric Cards (4 การ์ด)**
1. รายได้วันนี้ (฿) + จำนวนรายการ
2. รายได้เดือนนี้ (฿) — สีเขียว
3. กำไรสุทธิเดือนนี้ (฿) — สีเขียว/แดง ตามค่า
4. % เทียบเป้า 50,000 ฿ — มี progress bar

**กราฟรายได้ 7 วันล่าสุด**
- Bar chart แบบ pure CSS (ไม่ต้อง library)
- แต่ละแท่ง = 1 วัน แสดงชื่อวัน (จ. อ. พ. ฯลฯ)
- ความสูงแท่ง proportional กับรายได้

**สัดส่วนสินค้าเดือนนี้**
- แสดง 4 สินค้า: Cold Brew 🧊, Drip ร้อน ☕, Japanese Iced 🧋, กาแฟนม 🥛
- แต่ละแถว: icon + ชื่อ + จำนวน + รายได้

**สถานะเมล็ดกาแฟ**
- แสดงเมล็ดที่ active + มีสต็อก > 0
- แต่ละแถว: ชื่อ + กรัมเหลือ + roast date + badge สถานะ Peak

**แจ้งเตือน**
- สิ้นเปลืองที่ต่ำกว่า reorderLevel → แสดงพื้นแดงอ่อน
- เมล็ดที่ Fading/Expired → แสดงพื้นส้มอ่อน
- ถ้าไม่มีแจ้งเตือน แสดง "✅ ไม่มีรายการเร่งด่วน" สีเขียว

**สรุป P&L เดือนนี้**
- รายได้ (สีเขียว)
- ต้นทุนสินค้า + ค่าใช้จ่าย (สีแดง) พร้อมแยก COGS กับ อื่นๆ
- กำไรสุทธิ + Margin %

---

## หน้า 2: สต็อกเมล็ดกาแฟ 🫘

### Peak Period Logic (สำคัญมาก)

คำนวณจาก roastDate + roastLevel:

| สถานะ | คั่วอ่อน (วันหลังคั่ว) | คั่วอื่นๆ (วันหลังคั่ว) | สี | 
|--------|----------------------|----------------------|-----|
| Degassing | 0-6 | 0-4 | `--text-muted` #94a3b8 |
| Peak | 7-14 | 5-12 | `--green` #22c55e |
| Sweet Spot | 10-13 | 8-11 | `--yellow` #f59e0b |
| Fading | 15-21 | 13-19 | `--orange` #f97316 |
| Expired | 22+ | 20+ | `--red` #ef4444 |

Sweet Spot อยู่ภายใน Peak (เป็น subset)

### ตาราง Active Beans
แสดงคอลัมน์:
- **เมล็ด**: ชื่อ + origin ข้างล่าง
- **Process**: badge สี (Natural=ส้ม, Washed=น้ำเงิน, อื่นๆ=เหลือง)
- **คั่ว**: ระดับคั่ว
- **Roast Date**: วันที่คั่ว
- **สถานะ**: badge + "วันที่ X หลังคั่ว"
- **คงเหลือ**: กรัม (สีแดงถ้า < 50g)
- **ต้นทุน/g**: คำนวณจาก cost_total ÷ quantity_g เดิม
- **ปุ่ม**: หัก | แก้ไข | ลบ

### ปุ่มต่างๆ (ทุกปุ่มต้องทำงานจริง)
- **"+ เพิ่มเมล็ด"** → เปิด Modal เพิ่มเมล็ดใหม่
- **"หัก"** → prompt ถามกรัมที่จะหัก → หักจาก quantity_g
- **"แก้ไข"** → เปิด Modal แก้ไข โหลดข้อมูลเดิมมาให้ครบทุก field
- **"ลบ"** → confirm dialog → ลบออก

### หมดสต็อก / ปิดใช้งาน
- แสดงเมล็ดที่ quantity_g = 0 หรือ active = false
- Opacity 0.6
- มีปุ่ม "แก้ไข" เพื่อเปิดใช้งานใหม่ได้

### Modal เพิ่ม/แก้ไขเมล็ด
Fields ทั้งหมดต้อง editable:
- ชื่อเมล็ด (text input)
- แหล่งปลูก / Origin (text input)
- Processing (dropdown): Natural, Washed, Honey, Lactic Fermentation, Anaerobic, Barrel Aged, อื่นๆ
- ระดับคั่ว (dropdown): อ่อน, กลาง-อ่อน, กลาง, กลาง-เข้ม, เข้ม
- Roast Date (date picker)
- น้ำหนัก กรัม (number input)
- ราคารวม บาท (number input)
- หมายเหตุ (text input)
- ใช้งานอยู่ (checkbox)
- ปุ่ม "💾 บันทึก"

### Pre-loaded Data (แก้ไข + ลบได้)
```
1. Brazil Santos | Brazil | Natural | กลาง-เข้ม | 2026-04-01 | 500g | 250฿ | "Cold brew / กาแฟนม"
2. Ethiopia Yirgacheffe Natural | Ethiopia | Natural | อ่อน | 2026-04-15 | 400g | 560฿ | "ทดลองเปรียบเทียบ processing"
3. Ethiopia Aricha Washed | Ethiopia | Washed | อ่อน | 2026-04-15 | 400g | 560฿ | "ทดลองเปรียบเทียบ processing"
4. Honduras Whiskey Barrel Aged | Honduras | Barrel Aged | อ่อน | 2026-04-15 | 100g | 350฿ | "รอทดลอง"
```
**สำคัญ**: ข้อมูลเหล่านี้ใส่เป็น default ตอน first launch เท่านั้น ถ้า user แก้ไขหรือลบแล้ว จะไม่กลับมาใหม่ (เช็คจาก IndexedDB ว่ามีข้อมูลหรือยัง)

---

## หน้า 3: การขาย 💰

### Quick Add Buttons
แถวปุ่ม 4 ปุ่ม (outline style):
- 🧊 Cold Brew
- ☕ Drip (ร้อน)
- 🧋 Japanese Iced
- 🥛 กาแฟนม

กดแล้วเปิด Modal บันทึกขาย พร้อม pre-fill ราคาและต้นทุนจาก settings

### สรุปวันนี้
Card highlight (background accent 10%):
- รายได้วันนี้ (฿)
- จำนวนรายการ
- แยกตามสินค้า (แสดงเฉพาะที่มียอด)

### Filter
- ปุ่ม "ทั้งหมด" / "วันนี้" / date picker เลือกวัน
- กรองตารางตาม filter ที่เลือก

### ตาราง Sales
คอลัมน์: วันที่ | สินค้า | จำนวน | ราคา | รวม | ต้นทุน | กำไร (สีเขียว/แดง) | ช่องทาง | ลูกค้า | ปุ่มลบ
- ถ้าไม่มีข้อมูล แสดง "ยังไม่มีข้อมูลการขาย — กดปุ่ม + บันทึกขาย เพื่อเริ่มต้น"
- เรียงจากใหม่ไปเก่า

### Modal บันทึกขาย
Fields:
- วันที่ (date picker — default วันนี้)
- สินค้า (dropdown — เปลี่ยนแล้ว auto-fill ราคา + ต้นทุน จาก settings)
- เมล็ดที่ใช้ (dropdown — แสดงเฉพาะ bean ที่ active + มีสต็อก พร้อมแสดงกรัมเหลือ) — ถ้าเลือก จะหักสต็อกอัตโนมัติ (cold_brew = 26g/ขวด, drip = 20g/แก้ว)
- **ลูกค้า (dropdown — แสดงรายชื่อลูกค้าที่มี + ตัวเลือก "— ไม่ระบุ —" + ตัวเลือก "+ เพิ่มลูกค้าใหม่")** ← ฟีเจอร์ใหม่
  - ถ้าเลือก "+ เพิ่มลูกค้าใหม่" → เปิด modal ซ้อนให้กรอกชื่อ + เบอร์ + LINE ID ก่อน แล้วกลับมาเลือกอัตโนมัติ
- จำนวน (number — default 1)
- ราคาขาย ฿ (number — editable ปรับได้)
- ต้นทุน ฿ (number — editable ปรับได้)
- ช่องทาง (dropdown): LINE OA, Instagram, TikTok, Walk-in, Grab, LINE MAN, อื่นๆ
- หมายเหตุ (text)
- **สรุปก่อนบันทึก**: box แสดงรวมรายได้ / ต้นทุน / กำไร
- ปุ่ม "💾 บันทึกการขาย"

---

## หน้า 4: ลูกค้า 👥 (ฟีเจอร์ใหม่)

### รายการลูกค้า
แสดงเป็น card grid:
- **ชื่อ** (ตัวใหญ่)
- **ช่องทาง** (badge สี)
- **เบอร์โทร / LINE ID** (ถ้ามี)
- **สั่งมาแล้ว**: X ครั้ง | รวม ฿X,XXX
- **Tags**: แสดงเป็น badge (เช่น "ลูกค้าประจำ", "ชอบ fruity")
- **หมายเหตุ** (ถ้ามี)
- ปุ่ม: ดูประวัติ | แก้ไข | ลบ

### ปุ่ม "+ เพิ่มลูกค้า"
เปิด Modal:
- ชื่อ (text — required)
- เบอร์โทร (text — optional)
- LINE ID (text — optional)
- ช่องทางที่รู้จัก (dropdown): LINE OA, Instagram, TikTok, Walk-in, Grab, LINE MAN, อื่นๆ
- หมายเหตุ (text — optional) เช่น "ชอบเปรี้ยว ไม่ชอบขม"
- Tags (text input — กด Enter หรือ comma เพื่อเพิ่ม tag ใหม่)
- ปุ่ม "💾 บันทึก"

### หน้า "ดูประวัติ" ลูกค้า
เปิด Modal ขนาดใหญ่ขึ้น (max-width 600px):
- **หัว**: ชื่อ + ข้อมูลติดต่อ + tags
- **สถิติ**: จำนวน order ทั้งหมด | ยอดใช้จ่ายรวม | เมนูที่สั่งบ่อยที่สุด | วันที่สั่งล่าสุด
- **ตาราง order history**: วันที่ | สินค้า | จำนวน | ราคา — เรียงจากใหม่ไปเก่า
- ข้อมูล query จาก `sales` store ที่ customerId ตรงกัน

### Search / Filter
- ช่อง search ค้นหาจากชื่อ
- ลำดับ: ลูกค้าที่สั่งล่าสุด อยู่บนสุด

---

## หน้า 5: สิ้นเปลือง 📦

### แสดงตามหมวด
จัดกลุ่มตาม category: บรรจุภัณฑ์, อุปกรณ์ชง, วัตถุดิบ, อื่นๆ

แต่ละ item เป็น card:
- ชื่อ
- **badge "สั่งเพิ่ม!"** (สีแดง ถ้า quantity ≤ reorderLevel + border สีแดง)
- จำนวนคงเหลือ (ตัวใหญ่) + หน่วย + / min reorderLevel
- ราคา/หน่วย
- ปุ่ม: "+ เติม" | "- ใช้" | "แก้ไข" | "ลบ"

### ปุ่มต่างๆ
- **"+ เติม"** → prompt ถามจำนวนที่เพิ่ม → เพิ่ม quantity
- **"- ใช้"** → prompt ถามจำนวนที่ใช้ → ลด quantity (ห้ามต่ำกว่า 0)
- **"แก้ไข"** → เปิด Modal แก้ไข โหลดข้อมูลเดิมมาให้ครบ
- **"ลบ"** → confirm dialog → ลบออก

### Modal เพิ่ม/แก้ไข
- ชื่อ (text)
- หมวด (dropdown): บรรจุภัณฑ์, อุปกรณ์ชง, วัตถุดิบ, อื่นๆ
- หน่วย (text) เช่น "ใบ", "แผ่น"
- จำนวน (number)
- ราคา/หน่วย (number)
- จุดสั่งเพิ่ม (number)
- ปุ่ม "💾 บันทึก"

### Pre-loaded Data (แก้ไข + ลบได้)
```
1. ขวดแก้ว 300ml | บรรจุภัณฑ์ | 0 ใบ | ฿13/ใบ | reorder: 20
2. สติกเกอร์ฉลาก | บรรจุภัณฑ์ | 0 แผ่น | ฿4/แผ่น | reorder: 20
3. กระดาษกรอง Hario V60 02 | อุปกรณ์ชง | 100 แผ่น | ฿1.5/แผ่น | reorder: 30
4. ฝาขวดแก้ว | บรรจุภัณฑ์ | 0 อัน | ฿3/อัน | reorder: 20
```

---

## หน้า 6: รายจ่าย 🧾

### สรุปเดือนนี้
Card highlight:
- รายจ่ายเดือนนี้ (฿) สีแดง
- แยกตามหมวดที่มีค่า

### ตาราง
คอลัมน์: วันที่ | หมวด (badge สีน้ำเงิน) | รายละเอียด | จำนวนเงิน (สีแดง) | ปุ่มลบ
- เรียงจากใหม่ไปเก่า

### ปุ่ม "+ เพิ่มรายจ่าย"
Modal:
- วันที่ (date — default วันนี้)
- หมวด (dropdown): วัตถุดิบ, บรรจุภัณฑ์, อุปกรณ์, ค่าส่ง, ค่าธรรมเนียม, การตลาด, ค่าน้ำ/ไฟ, อื่นๆ
- รายละเอียด (text)
- จำนวนเงิน (number)
- ปุ่ม "💾 บันทึก"

---

## หน้า 7: ตั้งค่า ⚙️

### ราคาสินค้า (ค่าเริ่มต้น)
Grid 2 คอลัมน์:
- Cold Brew ฿/ขวด (default 150)
- Drip ร้อน ฿/แก้ว (default 120)
- Japanese Iced ฿/แก้ว (default 130)
- กาแฟนม ฿/แก้ว (default 80)

### ต้นทุนสินค้า (ค่าเริ่มต้น)
Grid 3 คอลัมน์:
- Cold Brew ต้นทุน/ขวด (default 55)
- Drip ต้นทุน/แก้ว (default 30)
- กาแฟนม ต้นทุน/แก้ว (default 25)

### เป้าหมาย
- เป้ารายได้/เดือน (default 50000)

### ปุ่มบันทึก
- "💾 บันทึกการตั้งค่า" → alert "บันทึกเรียบร้อย ✅"

### ข้อมูลระบบ
- ปุ่ม "📥 Export JSON" → download ข้อมูลทั้งหมดจาก IndexedDB เป็น JSON file
- ปุ่ม "📤 Import JSON" → เลือก JSON file แล้ว import เข้า IndexedDB (confirm ก่อน overwrite)
- ปุ่ม "🗑️ รีเซ็ตข้อมูลทั้งหมด" (สีแดง) → confirm "ลบข้อมูลทั้งหมดแล้วเริ่มใหม่?" → clear IndexedDB + ใส่ default data ใหม่
- แสดงสถิติ: จำนวน record แต่ละ store

---

## Interaction Requirements (สำคัญ)

### ทุกปุ่มต้องทำงานจริง
- ปุ่มเพิ่ม → เปิด Modal → กรอกข้อมูล → บันทึกลง IndexedDB → refresh หน้าจอ
- ปุ่มแก้ไข → เปิด Modal → โหลดข้อมูลเดิมเข้า form ทุก field → แก้ไข → บันทึก update ลง IndexedDB
- ปุ่มลบ → confirm dialog → ลบจาก IndexedDB → refresh หน้าจอ
- ปุ่มหัก/เติม/ใช้ → prompt ถามจำนวน → update quantity → refresh

### ทุก Input ต้อง Editable
- text input → พิมพ์ได้ตรง
- number input → พิมพ์ได้ + ลบค่าเดิมได้ (ไม่ append)
- date picker → เลือกวันที่ได้
- dropdown/select → เลือกได้
- checkbox → toggle ได้

### Pre-loaded Data
- ใส่เป็น default ตอน first launch เท่านั้น (เช็คว่า IndexedDB มีข้อมูลแล้วหรือยัง)
- user สามารถแก้ไขและลบ pre-loaded data ได้ทั้งหมด
- ลบแล้วไม่กลับมา (ยกเว้นกด "รีเซ็ตข้อมูลทั้งหมด")

### Modal Behavior
- กด overlay (พื้นหลังมืด) → ปิด modal
- กด ✕ → ปิด modal
- ปิดแล้ว form reset

### Product Constants
```javascript
const PRODUCTS = [
  { key: "cold_brew", label: "Cold Brew", icon: "🧊" },
  { key: "drip_hot", label: "Drip (ร้อน)", icon: "☕" },
  { key: "drip_iced", label: "Japanese Iced", icon: "🧋" },
  { key: "latte", label: "กาแฟนม", icon: "🥛" },
];

const CHANNELS = ["LINE OA", "Instagram", "TikTok", "Walk-in", "Grab", "LINE MAN", "อื่นๆ"];
```

### Bean Deduction Logic (เมื่อบันทึกขาย)
ถ้าเลือกเมล็ด:
- cold_brew → หัก 26g × quantity
- drip_hot / drip_iced / latte → หัก 20g × quantity
- update bean quantity_g (ห้ามต่ำกว่า 0)

### Customer Stats Calculation
เมื่อแสดงข้อมูลลูกค้า:
- totalOrders = count sales ที่ customerId ตรง
- totalSpent = sum (price × quantity) ของ sales ที่ customerId ตรง
- favoriteProduct = product ที่มี count สูงสุด
- lastOrderDate = date ล่าสุดจาก sales

---

## Deploy Instructions (ใส่ใน README.md)

### GitHub Pages (ฟรี)

```bash
# 1. สร้าง repo ใหม่
git init
git add .
git commit -m "Coffee Manager PWA v1.0"

# 2. สร้าง repo บน GitHub แล้ว push
git remote add origin https://github.com/USERNAME/coffee-manager.git
git branch -M main
git push -u origin main

# 3. เปิด GitHub Pages
# Settings → Pages → Source: Deploy from branch → Branch: main → / (root) → Save

# 4. เข้าใช้งานที่
# https://USERNAME.github.io/coffee-manager/
```

### Install บน Android Tablet
1. เปิด Chrome → ไปที่ URL
2. Chrome จะแสดง "Install app" หรือ "Add to Home screen"
3. กด Install → ได้ไอคอนบน Home screen
4. เปิดเป็นแอป standalone เต็มจอ ไม่มี address bar
5. ใช้งาน offline ได้หลัง install

---

## Testing Checklist

ก่อน deploy ให้ทดสอบทุกข้อ:

- [ ] เปิดครั้งแรก → มี default data (4 เมล็ด + 4 สิ้นเปลือง + settings)
- [ ] เพิ่ม/แก้ไข/ลบ เมล็ดกาแฟ → IndexedDB update ถูกต้อง
- [ ] เพิ่ม/แก้ไข/ลบ ลูกค้า → IndexedDB update ถูกต้อง
- [ ] บันทึกขาย → เลือกเมล็ด → สต็อกถูกหัก → เลือกลูกค้า → ประวัติลูกค้า update
- [ ] บันทึกขาย → ไม่เลือกเมล็ด/ลูกค้า → บันทึกได้ปกติ
- [ ] เพิ่ม/แก้ไข/ลบ สิ้นเปลือง + ปรับจำนวน (เติม/ใช้)
- [ ] เพิ่ม/ลบ รายจ่าย
- [ ] แก้ไข pre-loaded data (เมล็ด + สิ้นเปลือง) → ข้อมูลเปลี่ยนจริง
- [ ] ลบ pre-loaded data → ลบจริง ไม่กลับมา
- [ ] ตั้งค่า → บันทึก → ราคาเปลี่ยนตอนเปิด Modal ขาย
- [ ] Export JSON → ได้ไฟล์ครบถ้วน
- [ ] Import JSON → overwrite ข้อมูลสำเร็จ
- [ ] รีเซ็ต → กลับเป็น default
- [ ] Dashboard → ตัวเลขถูกต้องหลังเพิ่ม sales/expenses
- [ ] Peak Period badge → แสดงถูกต้องตาม roast date + roast level
- [ ] ดูประวัติลูกค้า → แสดง order history ถูกต้อง
- [ ] Modal ทุกอัน → input ทุกช่องพิมพ์ได้ / เลือกได้
- [ ] ปิด browser → เปิดใหม่ → ข้อมูลยังอยู่
- [ ] Offline → ปิด WiFi → เปิดแอป → ใช้งานได้ทุกฟังก์ชัน
- [ ] Responsive → mobile (<768px) ใช้ bottom nav / desktop ใช้ sidebar
