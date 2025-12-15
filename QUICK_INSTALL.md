# Quick Install CCG on Ubuntu

## Cách 1: Tự động (Khuyến nghị)

SSH vào máy Ubuntu và chạy lệnh này:

```bash
curl -fsSL https://raw.githubusercontent.com/phuongrealmax/claude-code-guardian/master/deploy-ubuntu.sh | bash
```

**Hoặc** tải script về và chạy:

```bash
wget https://raw.githubusercontent.com/phuongrealmax/claude-code-guardian/master/deploy-ubuntu.sh
chmod +x deploy-ubuntu.sh
./deploy-ubuntu.sh
```

## Cách 2: Thủ công (nhanh nhất)

Copy và paste từng lệnh vào terminal Ubuntu:

```bash
# 1. Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2. Clone repo
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/phuongrealmax/claude-code-guardian.git
cd claude-code-guardian
sudo chown -R $USER:$USER .

# 3. Build
npm install
npm run build

# 4. Tạo config
cat > .env <<'EOF'
CCG_PROJECT_ROOT=/opt/claude-code-guardian
CCG_LOG_LEVEL=info
CCG_API_PORT=3334
CCG_API_HOST=0.0.0.0
CCG_CORS_ORIGINS=http://192.168.31.253:3333,http://localhost:3333
EOF

# 5. Tạo systemd service
sudo tee /etc/systemd/system/ccg.service <<EOF
[Unit]
Description=CCG API Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/claude-code-guardian
Environment="NODE_ENV=production"
EnvironmentFile=/opt/claude-code-guardian/.env
ExecStart=/usr/bin/node /opt/claude-code-guardian/dist/api/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 6. Start service
sudo systemctl daemon-reload
sudo systemctl enable ccg
sudo systemctl start ccg

# 7. Mở firewall
sudo ufw allow 3334/tcp

# 8. Kiểm tra
sudo systemctl status ccg
curl http://192.168.31.253:3334/health
```

## Sau khi cài xong

Truy cập:
- API: http://192.168.31.253:3334
- Health: http://192.168.31.253:3334/health

Xem logs:
```bash
sudo journalctl -u ccg -f
```

Quản lý service:
```bash
sudo systemctl stop ccg      # Dừng
sudo systemctl start ccg     # Khởi động
sudo systemctl restart ccg   # Khởi động lại
sudo systemctl status ccg    # Xem trạng thái
```

## Nếu muốn tôi SSH vào cài

Cung cấp thông tin:
- Username: `realm` (hoặc username khác)
- Password: ?
- Hoặc thêm SSH public key của tôi vào `~/.ssh/authorized_keys`
