#!/bin/bash
# Deploy script for openode.ai

SERVER="root@164.90.137.5"
KEY="~/.ssh/openode-droplet-key"
APP_DIR="/root/claude-bun-cli"

echo "🚀 Deploying to openode.ai..."

# Sync files
echo "📦 Syncing files..."
rsync -avz -e "ssh -i $KEY" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=sandbox \
  --exclude=logs \
  --exclude="*.log" \
  ./ $SERVER:$APP_DIR/

# Install dependencies and restart
echo "🔧 Installing dependencies and restarting..."
ssh -i $KEY $SERVER "cd $APP_DIR && /root/.bun/bin/bun install && pm2 restart claude-bun"

echo "✅ Deployment complete!"
echo "🌐 Visit https://openode.ai"