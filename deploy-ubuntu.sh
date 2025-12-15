#!/bin/bash
# CCG Ubuntu Deployment Script
# Run this script on your Ubuntu server (192.168.31.253)

set -e

echo "======================================"
echo " CCG Ubuntu Server Deployment"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}Please do not run as root. Run as normal user.${NC}"
   exit 1
fi

# 1. Install Node.js 20 if not present
echo -e "${YELLOW}[1/7] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "Node.js version is too old. Upgrading to v20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo -e "${GREEN}Node.js $(node --version) already installed${NC}"
    fi
fi

# 2. Install git if not present
echo -e "${YELLOW}[2/7] Checking Git...${NC}"
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    sudo apt-get update
    sudo apt-get install -y git
else
    echo -e "${GREEN}Git $(git --version) already installed${NC}"
fi

# 3. Clone or update repository
echo -e "${YELLOW}[3/7] Setting up CCG repository...${NC}"
CCG_DIR="/opt/claude-code-guardian"

if [ -d "$CCG_DIR" ]; then
    echo "CCG directory exists. Updating..."
    cd "$CCG_DIR"
    sudo chown -R $USER:$USER .
    git fetch origin
    git reset --hard origin/master
else
    echo "Cloning CCG repository..."
    sudo mkdir -p /opt
    cd /opt
    sudo git clone https://github.com/phuongrealmax/claude-code-guardian.git
    sudo chown -R $USER:$USER claude-code-guardian
    cd claude-code-guardian
fi

# 4. Install dependencies and build
echo -e "${YELLOW}[4/7] Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}[5/7] Building project...${NC}"
npm run build

# 5. Create .env file
echo -e "${YELLOW}[6/7] Creating configuration...${NC}"
cat > .env <<EOF
CCG_PROJECT_ROOT=/opt/claude-code-guardian
CCG_LOG_LEVEL=info
CCG_API_PORT=3334
CCG_API_HOST=0.0.0.0
CCG_CORS_ORIGINS=http://192.168.31.253:3333,http://localhost:3333,http://192.168.31.1:3333
EOF

echo -e "${GREEN}Configuration created at .env${NC}"

# 6. Create systemd service
echo -e "${YELLOW}[7/7] Creating systemd service...${NC}"
sudo tee /etc/systemd/system/ccg.service > /dev/null <<EOF
[Unit]
Description=Claude Code Guardian API Server
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
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 7. Start service
sudo systemctl daemon-reload
sudo systemctl enable ccg
sudo systemctl restart ccg

# 8. Configure firewall
echo ""
echo "Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 3334/tcp
    echo -e "${GREEN}Firewall rule added (port 3334)${NC}"
fi

# 9. Wait a bit and check status
sleep 2
echo ""
echo "======================================"
echo -e "${GREEN} Installation Complete!${NC}"
echo "======================================"
echo ""

# Check service status
if systemctl is-active --quiet ccg; then
    echo -e "${GREEN}✓ CCG service is running${NC}"
    echo ""
    echo "Access points:"
    echo "  HTTP API:  http://192.168.31.253:3334"
    echo "  WebSocket: ws://192.168.31.253:3334"
    echo "  Health:    http://192.168.31.253:3334/health"
    echo ""
    echo "Test with:"
    echo "  curl http://192.168.31.253:3334/health"
    echo ""
    echo "View logs:"
    echo "  sudo journalctl -u ccg -f"
else
    echo -e "${RED}✗ CCG service failed to start${NC}"
    echo ""
    echo "Check logs with:"
    echo "  sudo journalctl -u ccg -n 50"
    exit 1
fi

echo ""
echo "Done!"
