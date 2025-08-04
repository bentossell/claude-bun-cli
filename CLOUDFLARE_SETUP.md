# Cloudflare Setup for openode.ai with Railway

## Step 1: DNS Configuration

### In Railway:
1. Go to your project's Settings → Domains
2. Click "Add Custom Domain"
3. Enter `openode.ai`
4. Railway will show you one of these options:
   - A CNAME target (e.g., `your-project.up.railway.app`)
   - Or IPv4/IPv6 addresses for A/AAAA records

### In Cloudflare:
1. Log into Cloudflare dashboard
2. Select your `openode.ai` domain
3. Go to DNS → Records

#### Option A: Using CNAME (Recommended for root domain)
```
Type: CNAME
Name: @ (or openode.ai)
Target: your-project.up.railway.app
Proxy status: Proxied (orange cloud ON)
TTL: Auto
```

#### Option B: Using A Records (If Railway provides IPs)
```
Type: A
Name: @
IPv4 address: [Railway-provided IP]
Proxy status: Proxied (orange cloud ON)
TTL: Auto
```

### For www subdomain (optional):
```
Type: CNAME
Name: www
Target: openode.ai
Proxy status: Proxied (orange cloud ON)
TTL: Auto
```

## Step 2: SSL/TLS Configuration

1. Go to SSL/TLS → Overview
2. Set encryption mode to **Full** or **Full (strict)**
   - **Full**: If Railway uses self-signed certificates
   - **Full (strict)**: If Railway uses valid certificates (recommended)

3. Go to SSL/TLS → Edge Certificates
4. Enable these settings:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: TLS 1.2

## Step 3: WebSocket Configuration

Good news! Cloudflare supports WebSockets by default on all plans. No special configuration needed.

However, ensure these settings:

1. Go to Network
2. Check that **WebSockets** is enabled (it should be by default)

## Step 4: Speed & Optimization Settings

For optimal WebSocket performance:

1. Go to Speed → Optimization
2. Disable or configure carefully:
   - **Rocket Loader™**: OFF (can interfere with WebSockets)
   - **Auto Minify**: JavaScript OFF (optional, but safer for WS)

## Step 5: Page Rules (Optional)

Create a page rule for WebSocket endpoints:

1. Go to Rules → Page Rules
2. Create new rule:
   - URL: `*openode.ai/chat*`
   - Settings:
     - Cache Level: Bypass
     - Disable Performance

## Step 6: Firewall Rules

Ensure WebSocket connections aren't blocked:

1. Go to Security → WAF
2. Check that no rules block WebSocket upgrade headers
3. If issues occur, create an exception rule:
   - Field: URI Path
   - Operator: contains
   - Value: `/chat`
   - Action: Skip all managed rules

## Verification Steps

After setup, verify everything works:

1. **DNS Propagation**: Use https://dnschecker.org to verify DNS
2. **SSL Certificate**: Visit https://openode.ai and check for valid certificate
3. **WebSocket Test**: 
   - Open browser console on https://openode.ai
   - Check for WebSocket connection success
   - Should see: "Connected to server" message

## Troubleshooting

### WebSocket Connection Fails
- Ensure SSL/TLS mode is set to "Full" or "Full (strict)"
- Check that Cloudflare proxy (orange cloud) is enabled
- Verify Railway app is running and healthy

### SSL Certificate Errors
- Wait 10-15 minutes for Cloudflare to issue certificate
- Ensure DNS records are properly configured
- Check SSL/TLS encryption mode

### 525 SSL Handshake Failed
- Change SSL/TLS mode from "Full (strict)" to "Full"
- This means Railway's origin certificate isn't trusted by Cloudflare

### WebSocket Drops/Timeouts
- Cloudflare has a 100-second timeout for idle WebSocket connections
- Implement heartbeat/ping-pong in your app if needed

## Environment Variables Checklist

Ensure these are set in Railway:
```
ANTHROPIC_API_KEY=your-key-here
HOST=0.0.0.0
DOMAIN=openode.ai
```

## Important Notes

- Cloudflare's free plan supports WebSockets
- No bandwidth limitations for WebSocket traffic
- Cloudflare acts as a reverse proxy, hiding your origin server's IP
- The app automatically handles ws:// → wss:// protocol upgrade

## Quick Setup Summary

1. ✅ Add CNAME record in Cloudflare DNS
2. ✅ Set SSL/TLS to "Full" mode
3. ✅ Enable "Always Use HTTPS"
4. ✅ Turn off Rocket Loader
5. ✅ WebSockets work automatically
6. ✅ Deploy to Railway with proper env vars