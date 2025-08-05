#!/bin/bash
# Deployment script for non-root user setup

SERVER="root@164.90.137.5"
KEY="~/.ssh/openode-droplet-key"
APP_DIR="/home/claude-app/app"
TEMP_DIR="/tmp/claude-deploy"

echo "🚀 Deploying to openode.ai (non-root setup)..."

# Create temp directory on server
echo "📦 Preparing deployment..."
ssh -i $KEY $SERVER "mkdir -p $TEMP_DIR"

# Sync files to temp directory first (as root)
echo "📦 Syncing files..."
rsync -avz -e "ssh -i $KEY" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=sandbox \
  --exclude=logs \
  --exclude="*.log" \
  --exclude=".env" \
  ./ $SERVER:$TEMP_DIR/

# Move files and set permissions
echo "🔧 Setting up application..."
ssh -i $KEY $SERVER << 'EOF'
  # Copy files to claude-app's directory
  sudo rm -rf /home/claude-app/app/*
  sudo cp -r /tmp/claude-deploy/* /home/claude-app/app/
  sudo cp -r /tmp/claude-deploy/.[^.]* /home/claude-app/app/ 2>/dev/null || true
  
  # Set ownership
  sudo chown -R claude-app:claude-app /home/claude-app/app
  
  # Create necessary directories
  sudo -u claude-app mkdir -p /home/claude-app/app/sandbox
  sudo -u claude-app mkdir -p /home/claude-app/app/logs
  sudo -u claude-app mkdir -p /home/claude-app/app/.claude
  
  # Install dependencies as claude-app
  cd /home/claude-app/app
  sudo -u claude-app /home/claude-app/.bun/bin/bun install
  
  # Clean up temp directory
  rm -rf /tmp/claude-deploy
  
  # Copy environment variables if they exist
  if [ -f /root/claude-bun-cli/.env ]; then
    sudo cp /root/claude-bun-cli/.env /home/claude-app/app/.env
    sudo chown claude-app:claude-app /home/claude-app/app/.env
    sudo chmod 600 /home/claude-app/app/.env
  fi
  
  # Restart service
  sudo systemctl restart claude-app
  
  echo "✅ Deployment complete!"
EOF

echo "✅ Deployment complete!"
echo "🌐 Visit https://openode.ai"
echo ""
echo "📊 Check status: ssh -i $KEY $SERVER 'sudo systemctl status claude-app'"
echo "📝 View logs: ssh -i $KEY $SERVER 'sudo journalctl -u claude-app -f'"