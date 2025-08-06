# PR Preview Deployment Plan

## 1. Infrastructure Setup

### DNS Configuration
```
# Add wildcard subdomain to DigitalOcean DNS
*.preview.openode.ai → 164.90.137.5
```

### Caddy Configuration
```caddy
# /etc/caddy/Caddyfile addition
*.preview.openode.ai {
    reverse_proxy {
        to localhost:4000-4999
        lb_policy first
        
        @pr123 host pr-123.preview.openode.ai
        handle @pr123 {
            reverse_proxy localhost:4123
        }
        
        # Dynamic routing based on subdomain
        # Extract PR number from subdomain
    }
}
```

## 2. Docker Setup

### Dockerfile for Preview Builds
```dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install

# Copy application code
COPY . .

# Expose dynamic port
ARG PORT=3000
EXPOSE ${PORT}

# Start the application
CMD ["bun", "run", "src/server.ts"]
```

### Docker Compose Template
```yaml
version: '3.8'
services:
  pr-${PR_NUMBER}:
    build:
      context: .
      args:
        PORT: ${PORT}
    container_name: openode-pr-${PR_NUMBER}
    ports:
      - "${PORT}:3000"
    environment:
      - NODE_ENV=preview
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PR_NUMBER=${PR_NUMBER}
    volumes:
      - ./sandbox-pr-${PR_NUMBER}:/app/sandbox
    networks:
      - preview-network

networks:
  preview-network:
    driver: bridge
```

## 3. GitHub Actions Workflow

### `.github/workflows/pr-preview.yml`
```yaml
name: Deploy PR Preview

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event.action != 'closed'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate Preview Config
        id: preview
        run: |
          PR_NUMBER=${{ github.event.pull_request.number }}
          PORT=$((4000 + PR_NUMBER))
          echo "pr_number=${PR_NUMBER}" >> $GITHUB_OUTPUT
          echo "port=${PORT}" >> $GITHUB_OUTPUT
          echo "url=https://pr-${PR_NUMBER}.preview.openode.ai" >> $GITHUB_OUTPUT
      
      - name: Deploy to Server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: 164.90.137.5
          username: root
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /home/claude-app/previews
            
            # Clone/update PR code
            if [ -d "pr-${{ steps.preview.outputs.pr_number }}" ]; then
              cd pr-${{ steps.preview.outputs.pr_number }}
              git fetch origin pull/${{ steps.preview.outputs.pr_number }}/head:pr
              git checkout pr
              git pull
            else
              git clone https://github.com/${{ github.repository }}.git pr-${{ steps.preview.outputs.pr_number }}
              cd pr-${{ steps.preview.outputs.pr_number }}
              git fetch origin pull/${{ steps.preview.outputs.pr_number }}/head:pr
              git checkout pr
            fi
            
            # Build and run Docker container
            docker-compose down || true
            PR_NUMBER=${{ steps.preview.outputs.pr_number }} \
            PORT=${{ steps.preview.outputs.port }} \
            ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }} \
            docker-compose up -d --build
      
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.preview.outputs.url }}';
            const body = `## 🚀 Preview Deployment\n\nYour preview is ready at: ${url}\n\n**Status:** ✅ Deployed\n**Updated:** ${new Date().toISOString()}`;
            
            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            
            const botComment = comments.find(comment => 
              comment.user.type === 'Bot' && 
              comment.body.includes('Preview Deployment')
            );
            
            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body
              });
            }

  cleanup-preview:
    runs-on: ubuntu-latest
    if: github.event.action == 'closed'
    
    steps:
      - name: Remove Preview
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: 164.90.137.5
          username: root
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            PR_NUMBER=${{ github.event.pull_request.number }}
            cd /home/claude-app/previews
            
            # Stop and remove container
            if [ -d "pr-${PR_NUMBER}" ]; then
              cd pr-${PR_NUMBER}
              docker-compose down
              cd ..
              rm -rf pr-${PR_NUMBER}
            fi
```

## 4. Server Setup Script

### `setup-preview-system.sh`
```bash
#!/bin/bash

# Create preview directory structure
mkdir -p /home/claude-app/previews
chown -R claude-app:claude-app /home/claude-app/previews

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker claude-app
fi

# Update Caddy configuration
cat >> /etc/caddy/Caddyfile << 'EOF'

# PR Preview routing
*.preview.openode.ai {
    @prRoute {
        header_regexp host Host ^pr-(\d+)\.preview\.openode\.ai$
    }
    
    handle @prRoute {
        reverse_proxy localhost:{re.host.1}
    }
    
    handle {
        respond "Preview not found" 404
    }
}
EOF

# Restart Caddy
systemctl restart caddy

echo "Preview system setup complete!"
```

## 5. Environment Considerations

### Resource Limits
- Set Docker container memory limits
- Implement maximum number of concurrent previews
- Auto-cleanup previews older than 7 days

### Security
- Separate ANTHROPIC_API_KEY for previews (with rate limits)
- Network isolation between preview containers
- Read-only volume mounts where possible

### Monitoring
- Health checks for preview containers
- Disk usage monitoring
- Automated alerts for failed deployments

## 6. Alternative: Lightweight Process-based Approach

If Docker seems too heavy, here's a simpler approach:

```bash
# PR deployment script
#!/bin/bash
PR_NUMBER=$1
PORT=$((4000 + PR_NUMBER))

# Create systemd service
cat > /etc/systemd/system/claude-app-pr-${PR_NUMBER}.service << EOF
[Unit]
Description=Claude App PR ${PR_NUMBER} Preview
After=network.target

[Service]
Type=simple
User=claude-app
WorkingDirectory=/home/claude-app/previews/pr-${PR_NUMBER}
Environment="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"
Environment="PORT=${PORT}"
ExecStart=/home/claude-app/.bun/bin/bun run src/server.ts
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable claude-app-pr-${PR_NUMBER}
systemctl start claude-app-pr-${PR_NUMBER}
```

## Next Steps

1. Choose between Docker or process-based approach
2. Set up wildcard DNS record
3. Configure Caddy for subdomain routing
4. Create GitHub Actions workflow
5. Test with a sample PR
6. Implement cleanup automation