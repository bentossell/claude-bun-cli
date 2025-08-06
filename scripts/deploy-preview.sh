#!/bin/bash

# Deploy PR Preview Script
# Usage: ./deploy-preview.sh <PR_NUMBER> <GITHUB_REPO> <ANTHROPIC_API_KEY>

set -e

PR_NUMBER=$1
GITHUB_REPO=$2
ANTHROPIC_API_KEY=$3
PORT=$((4000 + PR_NUMBER))
PREVIEW_DIR="/home/claude-app/previews/pr-${PR_NUMBER}"
SERVICE_NAME="claude-app-pr-${PR_NUMBER}"

if [ -z "$PR_NUMBER" ] || [ -z "$GITHUB_REPO" ] || [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Usage: $0 <PR_NUMBER> <GITHUB_REPO> <ANTHROPIC_API_KEY>"
    exit 1
fi

echo "🚀 Deploying PR #${PR_NUMBER} preview..."

# Create preview directory
mkdir -p /home/claude-app/previews

# Clone or update the PR code
if [ -d "$PREVIEW_DIR" ]; then
    echo "📂 Updating existing preview..."
    cd "$PREVIEW_DIR"
    git fetch origin pull/${PR_NUMBER}/head:pr-${PR_NUMBER}
    git checkout pr-${PR_NUMBER}
    git pull origin pull/${PR_NUMBER}/head
else
    echo "📂 Creating new preview..."
    cd /home/claude-app/previews
    git clone "https://github.com/${GITHUB_REPO}.git" "pr-${PR_NUMBER}"
    cd "$PREVIEW_DIR"
    git fetch origin pull/${PR_NUMBER}/head:pr-${PR_NUMBER}
    git checkout pr-${PR_NUMBER}
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Create .env file for the preview
cat > .env << EOF
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
PORT=${PORT}
NODE_ENV=preview
PR_NUMBER=${PR_NUMBER}
EOF

# Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=Claude App PR ${PR_NUMBER} Preview
After=network.target

[Service]
Type=simple
User=claude-app
Group=claude-app
WorkingDirectory=${PREVIEW_DIR}
Environment="PATH=/home/claude-app/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
EnvironmentFile=${PREVIEW_DIR}/.env
ExecStart=/home/claude-app/.bun/bin/bun run src/server.ts
Restart=on-failure
RestartSec=10

# Security restrictions
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${PREVIEW_DIR}/sandbox

[Install]
WantedBy=multi-user.target
EOF

# Create sandbox directory for this preview
mkdir -p "${PREVIEW_DIR}/sandbox"
chown -R claude-app:claude-app "$PREVIEW_DIR"

# Reload systemd and start the service
echo "🔄 Starting preview service..."
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl restart ${SERVICE_NAME}

# Wait for service to start
sleep 5

# Check if service is running
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "✅ Preview deployed successfully!"
    echo "🌐 URL: https://pr-${PR_NUMBER}.preview.openode.ai"
    echo "🔧 Port: ${PORT}"
    echo "📋 Service: ${SERVICE_NAME}"
else
    echo "❌ Failed to start preview service"
    sudo journalctl -u ${SERVICE_NAME} -n 50 --no-pager
    exit 1
fi