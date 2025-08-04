# Deployment Guide for Custom Domain

## Setting up openode.ai with Cloudflare

### 1. Server Configuration

Copy `.env.example` to `.env` and configure for production:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
HOST=0.0.0.0
DOMAIN=openode.ai
```

### 2. Cloudflare Setup

1. **DNS Configuration**:
   - Add an A record pointing `openode.ai` to your server IP
   - Add an A record pointing `www.openode.ai` to your server IP (optional)

2. **SSL/TLS Settings**:
   - Set SSL/TLS encryption mode to "Full" or "Full (strict)"
   - Enable "Always Use HTTPS"

3. **WebSocket Support**:
   - WebSockets are automatically supported with Cloudflare
   - The app will auto-detect HTTPS and use WSS connections

### 3. Server Deployment

```bash
# Install dependencies
bun install

# Start the server
bun run src/server.ts
```

For production, use a process manager like PM2:
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/server.ts --name "claude-bun-cli" --interpreter="bun"
```

### 4. Nginx Configuration (Optional)

If using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name openode.ai www.openode.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name openode.ai www.openode.ai;

    # SSL configuration (managed by Cloudflare)
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Features

✅ **WebSocket Support**: Automatically detects HTTPS and uses WSS  
✅ **Mobile Responsive**: Optimized for mobile devices  
✅ **Environment Configuration**: Supports custom domains via env vars  
✅ **Cloudflare Compatible**: Works seamlessly with Cloudflare proxy  

### 6. Troubleshooting

- **WebSocket connection fails**: Ensure Cloudflare SSL is set to "Full" mode
- **Mobile viewport issues**: The app includes proper viewport meta tags and responsive CSS
- **Connection errors**: Check that the server is binding to `0.0.0.0` not `localhost`