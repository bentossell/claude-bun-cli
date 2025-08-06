#!/bin/bash
# Setup script for non-root user configuration on production server

echo "🔒 Setting up non-root user for Claude app..."

# Create claude-app user if it doesn't exist
if ! id "claude-app" &>/dev/null; then
    echo "Creating claude-app user..."
    sudo useradd -m -s /bin/bash claude-app
    echo "✅ User claude-app created"
else
    echo "✅ User claude-app already exists"
fi

# Create application directory structure
echo "Setting up application directories..."
sudo mkdir -p /home/claude-app/app
sudo mkdir -p /home/claude-app/app/sandbox
sudo mkdir -p /home/claude-app/app/logs

# Set ownership
sudo chown -R claude-app:claude-app /home/claude-app/app
sudo chmod 755 /home/claude-app/app
sudo chmod 755 /home/claude-app/app/sandbox
sudo chmod 755 /home/claude-app/app/logs

# Install Bun for claude-app user
echo "Installing Bun for claude-app user..."
sudo -u claude-app bash -c 'curl -fsSL https://bun.sh/install | bash'

# Add Bun to claude-app's PATH
echo 'export BUN_INSTALL="$HOME/.bun"' | sudo tee -a /home/claude-app/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' | sudo tee -a /home/claude-app/.bashrc

# Create systemd service file
echo "Creating systemd service..."
sudo tee /etc/systemd/system/claude-app.service > /dev/null <<EOF
[Unit]
Description=Claude Bun CLI App
After=network.target

[Service]
Type=simple
User=claude-app
WorkingDirectory=/home/claude-app/app
Environment="PATH=/home/claude-app/.bun/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"
ExecStart=/home/claude-app/.bun/bin/bun run src/server.ts
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=no
ReadWritePaths=/home/claude-app/app/sandbox /home/claude-app/app/logs

[Install]
WantedBy=multi-user.target
EOF

# Add caddy user to claude-app group for file access
echo "Adding caddy user to claude-app group..."
sudo usermod -a -G claude-app caddy

# Reload systemd
sudo systemctl daemon-reload

echo "✅ Non-root user setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy application code to /home/claude-app/app"
echo "2. Set ANTHROPIC_API_KEY in environment"
echo "3. Start service: sudo systemctl start claude-app"
echo "4. Enable service: sudo systemctl enable claude-app"