# Coffee Manager PWA

ระบบบริหารจัดการร้านกาแฟ Specialty Coffee — ทำงาน offline 100% บน Android Tablet และ Desktop browser

## วิธี Deploy บน GitHub Pages (ฟรี)

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

## Install บน Android Tablet

1. เปิด Chrome → ไปที่ URL ของแอป
2. Chrome จะแสดง "Install app" หรือ "Add to Home screen"
3. กด Install → ได้ไอคอนบน Home screen
4. เปิดเป็นแอป standalone เต็มจอ ไม่มี address bar
5. ใช้งาน offline ได้หลัง install

## การเตรียมก่อน Deploy

1. เปิด `generate-icons.html` ในเบราว์เซอร์
2. กด "Download Icons" → ได้ `icon-192.png` และ `icon-512.png`
3. นำไฟล์ไปวางในโฟลเดอร์ `icons/`
4. Deploy ตามขั้นตอนด้านบน

## โครงสร้างไฟล์

```
coffee-manager/
├── index.html          # Main HTML (single page)
├── style.css           # Global styles (dark theme)
├── app.js              # Application logic (7 tabs)
├── db.js               # IndexedDB wrapper + seed data
├── sw.js               # Service Worker (offline + font cache)
├── manifest.json       # PWA manifest
├── generate-icons.html # เครื่องมือสร้างไอคอน
├── icons/
│   ├── icon-192.png    # App icon 192x192
│   └── icon-512.png    # App icon 512x512
└── README.md
```

## ฟีเจอร์

- **Dashboard** — รายได้วันนี้/เดือนนี้, กราฟ 7 วัน, P&L สรุป, แจ้งเตือนสต็อก
- **สต็อกเมล็ด** — ติดตาม Peak Period / Sweet Spot / Fading อัตโนมัติ
- **การขาย** — บันทึกขาย 4 เมนู, หักสต็อกอัตโนมัติ, เชื่อมลูกค้า
- **ลูกค้า** — CRM เก็บข้อมูล, tags, ดูประวัติ order
- **สิ้นเปลือง** — ติดตามสต็อก, แจ้งเตือนเมื่อต่ำกว่า reorder level
- **รายจ่าย** — บันทึกค่าใช้จ่าย แยกหมวด
- **ตั้งค่า** — ราคา/ต้นทุนสินค้า, Export/Import JSON, Reset ข้อมูล
