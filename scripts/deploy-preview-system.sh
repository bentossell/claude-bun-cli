#!/bin/bash

# Deploy the PR Preview System to your server
# Run this locally to set everything up

set -e

SERVER_IP="164.90.137.5"
SERVER_USER="root"
SSH_KEY_PATH="~/.ssh/openode-droplet-key"

echo "🚀 Deploying PR Preview System..."

# Make scripts executable locally
echo "📝 Making scripts executable..."
chmod +x scripts/*.sh

# Copy scripts to server
echo "📤 Copying scripts to server..."
scp -i $SSH_KEY_PATH scripts/deploy-preview.sh scripts/cleanup-preview.sh scripts/setup-preview-infrastructure.sh $SERVER_USER@$SERVER_IP:/home/claude-app/app/scripts/

# Copy Caddy config
echo "📋 Copying Caddy configuration..."
scp -i $SSH_KEY_PATH scripts/caddy-preview-config $SERVER_USER@$SERVER_IP:/tmp/

# Run setup on server
echo "🔧 Running setup on server..."
ssh -i $SSH_KEY_PATH $SERVER_USER@$SERVER_IP << 'EOF'
cd /home/claude-app/app
chmod +x scripts/*.sh
./scripts/setup-preview-infrastructure.sh
EOF

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Add DNS record: *.preview.openode.ai → $SERVER_IP"
echo "2. Add GitHub secrets:"
echo "   - DEPLOY_SSH_KEY: Your SSH private key"
echo "   - ANTHROPIC_API_KEY: Your Anthropic API key"
echo "3. Create a test PR to verify the system works"