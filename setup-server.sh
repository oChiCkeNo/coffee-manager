#!/bin/bash
# setup-server.sh — ติดตั้ง Coffee Manager บน Ubuntu Home Server
# รัน: bash setup-server.sh

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "☕  Coffee Manager — Ubuntu Server Setup"
echo "========================================"
echo ""

# ── 1. Node.js ────────────────────────────────────────────────
if command -v node &> /dev/null; then
  info "Node.js already installed: $(node -v)"
else
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  info "Node.js installed: $(node -v)"
fi

# build-essential required by better-sqlite3
if ! dpkg -l build-essential &>/dev/null; then
  echo "📦 Installing build-essential (required for better-sqlite3)..."
  sudo apt-get install -y build-essential
fi

# ── 2. npm install ────────────────────────────────────────────
echo "📦 Installing npm packages (express, better-sqlite3)..."
npm install
info "npm packages installed"

# ── 3. systemd service ────────────────────────────────────────
WORK_DIR=$(pwd)
SERVICE=/etc/systemd/system/coffee-manager.service

echo "⚙️  Creating systemd service at $SERVICE ..."
sudo tee "$SERVICE" > /dev/null <<EOF
[Unit]
Description=Coffee Manager PWA Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORK_DIR
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable coffee-manager
sudo systemctl restart coffee-manager
info "systemd service enabled and started"

# ── 4. Done ───────────────────────────────────────────────────
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "========================================"
echo -e "${GREEN}☕  Coffee Manager is running!${NC}"
echo ""
echo "  เครื่องนี้  : http://localhost:3000"
echo "  Tablet/PC   : http://${LOCAL_IP}:3000"
echo ""
echo "📱 ติดตั้งบน Tablet:"
echo "   Chrome → เปิด URL → กด Install App"
echo ""
echo "🔧 คำสั่งที่ใช้บ่อย:"
echo "   sudo systemctl status coffee-manager   # ดู status"
echo "   sudo systemctl restart coffee-manager  # restart"
echo "   sudo journalctl -u coffee-manager -f   # ดู logs"
echo ""
echo "🔄 อัปเดตแอปในอนาคต:"
echo "   git pull && sudo systemctl restart coffee-manager"
echo "   (ข้อมูลใน coffee.db ไม่หาย)"
echo "========================================"
