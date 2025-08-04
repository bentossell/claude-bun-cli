# Railway Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected to Railway
- Anthropic API key (get from https://console.anthropic.com)

## Environment Variables

In your Railway project settings, set the following environment variables:

### Required Variables
```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
HOST=0.0.0.0          # Required for Railway deployment
```

### Custom Domain Variables
```
DOMAIN=openode.ai      # Your custom domain
```

### Optional Variables
```
PORT=3000              # Railway will auto-assign if not set
```

## Deployment Steps

1. **Connect GitHub Repository**
   - In Railway dashboard, create new project
   - Select "Deploy from GitHub repo"
   - Choose your `claude-bun-cli` repository

2. **Configure Environment Variables**
   - Go to your Railway project settings
   - Navigate to "Variables" tab
   - Add the required environment variables listed above

3. **Deploy**
   - Railway will automatically deploy when you push to your connected branch
   - The `railway.json` configuration handles:
     - Bun runtime setup
     - Dependencies installation
     - Server startup command

4. **Access Your App**
   - Railway provides a default domain: `your-project.up.railway.app`
   - Or configure a custom domain in Railway settings

## Custom Domain Setup (openode.ai)

1. **In Railway:**
   - Go to Settings → Domains
   - Add custom domain: `openode.ai`
   - Railway will provide DNS records

2. **In Your DNS Provider (e.g., Cloudflare):**
   - Add CNAME record: `openode.ai` → `your-project.up.railway.app`
   - Or use Railway's provided A records
   - Enable proxy if using Cloudflare

3. **WebSocket Configuration:**
   - The app automatically detects HTTPS and uses WSS
   - No additional configuration needed
   - Cloudflare supports WebSockets by default

4. **Environment Variable:**
   - Set `DOMAIN=openode.ai` in Railway variables
   - This ensures proper domain handling in the app

## Configuration Files

### railway.json
- Configures build process with Nixpacks
- Specifies Bun as the runtime
- Sets the start command

### .env.example
- Template for local development
- Copy to `.env` for local testing
- Never commit `.env` file

## Troubleshooting

### WebSocket Connection Issues
- Ensure `HOST=0.0.0.0` is set in Railway environment variables
- Railway automatically handles WSS/HTTPS conversion

### Build Failures
- Check Railway build logs
- Ensure all dependencies are in `package.json`
- Verify `bun.lockb` is committed

### API Key Issues
- Verify `ANTHROPIC_API_KEY` is set correctly in Railway
- Check that the key has proper permissions
- The Claude SDK will use this key automatically

## Local Testing

Before deploying to Railway:

```bash
# Copy environment template
cp .env.example .env

# Add your API key to .env
# ANTHROPIC_API_KEY=your-key-here

# Install dependencies
bun install

# Run locally
bun run src/server.ts
```

## Additional Notes

- Railway provides automatic HTTPS/SSL
- WebSockets are fully supported
- The app auto-detects HTTPS and uses WSS accordingly
- Mobile-responsive UI works on all devices