#!/bin/bash
set -e

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y curl git unzip build-essential

# Install Bun
curl -fsSL https://bun.sh/install | bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.bun/bin:$PATH"

# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy

# Install PM2
npm install -g pm2

# Create app user
useradd -m -s /bin/bash appuser

# Create app directory
mkdir -p /home/appuser/claude-bun-cli
chown appuser:appuser /home/appuser/claude-bun-cli

# Create PM2 startup script
pm2 startup systemd -u appuser --hp /home/appuser

echo "Base setup complete!"