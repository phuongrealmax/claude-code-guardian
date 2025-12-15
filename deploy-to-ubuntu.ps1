# CCG Deployment to Ubuntu via PowerShell + SSH
# Usage: .\deploy-to-ubuntu.ps1

$hostname = "192.168.31.253"
$username = "mona"
$password = "123456"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " CCG Ubuntu Deployment via SSH" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Create deployment script
$deployScript = @'
#!/bin/bash
set -e

echo "======================================"
echo " Installing CCG on Ubuntu"
echo "======================================"

# Install Node.js 20
echo "[1/6] Installing Node.js 20..."
if ! command -v node &> /dev/null || [ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs git
fi

# Clone repository
echo "[2/6] Cloning repository..."
if [ -d "/opt/claude-code-guardian" ]; then
    cd /opt/claude-code-guardian
    sudo chown -R $USER:$USER .
    git pull
else
    sudo mkdir -p /opt
    cd /opt
    sudo git clone https://github.com/phuongrealmax/claude-code-guardian.git
    sudo chown -R $USER:$USER claude-code-guardian
    cd claude-code-guardian
fi

# Install dependencies
echo "[3/6] Installing dependencies..."
npm install

# Build
echo "[4/6] Building project..."
npm run build

# Create .env
echo "[5/6] Creating configuration..."
cat > .env <<EOF
CCG_PROJECT_ROOT=/opt/claude-code-guardian
CCG_LOG_LEVEL=info
CCG_API_PORT=3334
CCG_API_HOST=0.0.0.0
CCG_CORS_ORIGINS=http://192.168.31.253:3333,http://localhost:3333
EOF

# Create systemd service
sudo tee /etc/systemd/system/ccg.service > /dev/null <<EOF
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

# Start service
echo "[6/6] Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable ccg
sudo systemctl restart ccg

# Open firewall
if command -v ufw &> /dev/null; then
    sudo ufw allow 3334/tcp 2>/dev/null || true
fi

# Wait and check
sleep 3

echo ""
echo "======================================"
if systemctl is-active --quiet ccg; then
    echo "✓ Installation successful!"
    echo ""
    echo "API Server: http://192.168.31.253:3334"
    echo "Health: http://192.168.31.253:3334/health"
    echo ""
    echo "View logs: sudo journalctl -u ccg -f"
else
    echo "✗ Service failed to start"
    echo "Check logs: sudo journalctl -u ccg -n 50"
fi
echo "======================================"
'@

# Save script to temp file
$tempScript = [System.IO.Path]::GetTempFileName()
$deployScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "Uploading deployment script..." -ForegroundColor Yellow

# Use plink or ssh depending on what's available
if (Get-Command plink -ErrorAction SilentlyContinue) {
    # Using PuTTY's plink
    echo y | plink -ssh -pw $password $username@$hostname "cat > /tmp/deploy-ccg.sh" < $tempScript
    echo y | plink -ssh -pw $password $username@$hostname "bash /tmp/deploy-ccg.sh && rm /tmp/deploy-ccg.sh"
} else {
    # Using OpenSSH (requires manual password entry)
    Write-Host ""
    Write-Host "Password is: $password" -ForegroundColor Green
    Write-Host "You may need to enter it when prompted" -ForegroundColor Yellow
    Write-Host ""

    # Copy script
    scp -o StrictHostKeyChecking=no $tempScript "${username}@${hostname}:/tmp/deploy-ccg.sh"

    # Execute script
    ssh -o StrictHostKeyChecking=no $username@$hostname "bash /tmp/deploy-ccg.sh && rm /tmp/deploy-ccg.sh"
}

# Cleanup
Remove-Item $tempScript

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test with: curl http://192.168.31.253:3334/health" -ForegroundColor Cyan
