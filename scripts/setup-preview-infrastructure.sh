#!/bin/bash

# Setup Preview Infrastructure
# Run this once on your server to set up the preview system

set -e

echo "🔧 Setting up PR preview infrastructure..."

# Create preview directory
echo "📁 Creating preview directory..."
mkdir -p /home/claude-app/previews
chown -R claude-app:claude-app /home/claude-app/previews

# Backup current Caddy configuration
echo "📋 Backing up Caddy configuration..."
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup.$(date +%Y%m%d-%H%M%S)

# Add preview subdomain configuration to Caddy
echo "🌐 Updating Caddy configuration..."
cat >> /etc/caddy/Caddyfile << 'EOF'

# PR Preview Routing
*.preview.openode.ai {
    # Extract PR number from subdomain
    @preview header_regexp host Host ^pr-([0-9]+)\.preview\.openode\.ai$

    handle @preview {
        # Calculate port from PR number (4000 + PR number)
        reverse_proxy localhost:{re.host.1}
    }

    handle {
        respond "Preview not found" 404
    }
}
EOF

# Create a Caddy snippet for dynamic port routing
cat > /etc/caddy/preview-router.json << 'EOF'
{
  "apps": {
    "http": {
      "servers": {
        "preview": {
          "listen": [":443"],
          "routes": [{
            "match": [{
              "host": ["*.preview.openode.ai"]
            }],
            "handle": [{
              "@id": "preview_proxy",
              "handler": "subroute",
              "routes": [{
                "handle": [{
                  "handler": "reverse_proxy",
                  "upstreams": [{
                    "dial": "localhost:{http.request.host.1}"
                  }]
                }]
              }]
            }]
          }]
        }
      }
    }
  }
}
EOF

# Test Caddy configuration
echo "🧪 Testing Caddy configuration..."
caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy
echo "🔄 Reloading Caddy..."
systemctl reload caddy

# Create cleanup cron job
echo "⏰ Setting up cleanup cron job..."
cat > /home/claude-app/previews/cleanup-old-previews.sh << 'EOF'
#!/bin/bash

# Cleanup previews older than 7 days
echo "🧹 Cleaning up old previews..."

find /home/claude-app/previews -maxdepth 1 -type d -name "pr-*" -mtime +7 | while read dir; do
    PR_NUMBER=$(basename "$dir" | sed 's/pr-//')
    echo "Cleaning up PR $PR_NUMBER (older than 7 days)..."
    /home/claude-app/app/scripts/cleanup-preview.sh "$PR_NUMBER"
done
EOF

chmod +x /home/claude-app/previews/cleanup-old-previews.sh

# Add cron job for daily cleanup
(crontab -u claude-app -l 2>/dev/null; echo "0 2 * * * /home/claude-app/previews/cleanup-old-previews.sh >> /home/claude-app/previews/cleanup.log 2>&1") | crontab -u claude-app -

echo "✅ Preview infrastructure setup complete!"
echo ""
echo "Next steps:"
echo "1. Add wildcard DNS record: *.preview.openode.ai → $(curl -s ifconfig.me)"
echo "2. Make deployment scripts executable: chmod +x scripts/*.sh"
echo "3. Copy scripts to server: scp scripts/*.sh root@your-server:/home/claude-app/app/scripts/"
echo "4. Set up GitHub Actions workflow"