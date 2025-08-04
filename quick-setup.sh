#!/bin/bash
set -e

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Caddy
apt update
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy

# Install Node.js for PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Clone the repository
cd /root
git clone https://github.com/bentossell/claude-bun-cli.git
cd claude-bun-cli

# Install dependencies
/root/.bun/bin/bun install

# Create sandbox directory
mkdir -p sandbox
chmod 755 sandbox

echo "Quick setup complete!"