# VPS Deployment Plan: DigitalOcean + Caddy

## Critical Considerations

### 1. Environment & Permissions
- Claude SDK needs write access to sandbox directories
- Tool execution requires proper user permissions (file creation, command execution)
- API key must be set as environment variable: `ANTHROPIC_API_KEY`

### 2. Conversation Memory
- Current implementation creates new `ClaudeSDKSession` per session ID
- Sessions are stored in-memory (lost on server restart)
- Consider Redis/SQLite for persistence across restarts

### 3. WebSocket Configuration
- Caddy needs explicit WebSocket proxying
- Cloudflare requires WebSocket support enabled
- Long-running connections need proper timeouts

### 4. Sandbox Security
- Each workspace gets isolated directory
- Claude SDK runs with `bypassPermissions` - tools have full access
- Consider disk space management for sandbox directories

## Deployment Steps

### Phase 1: Server Setup
- Ubuntu 22.04 droplet (2GB RAM minimum)
- SSH key authentication
- Non-root user with sudo

### Phase 2: Software Stack
```
Bun → PM2 → Caddy → Cloudflare → User
```

### Phase 3: Critical Configurations

**Caddyfile:**
```
openode.ai {
    reverse_proxy localhost:3000
    
    @websocket {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websocket localhost:3000
}
```

**PM2 Ecosystem:**
```javascript
module.exports = {
  apps: [{
    name: 'claude-bun',
    script: 'bun',
    args: 'run src/server.ts',
    env: {
      ANTHROPIC_API_KEY: 'your-key',
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log'
  }]
}
```

### Phase 4: File System
```
/home/user/claude-bun-cli/
├── sandbox/     (chmod 755, owned by app user)
├── logs/        (for PM2 logs)
└── [app files]
```

## Key Differences from Local

1. **Persistence**: Server restarts lose in-memory sessions
2. **Concurrency**: Multiple sessions can create resource contention
3. **Disk Usage**: Sandbox directories accumulate over time
4. **API Limits**: Consider rate limiting if usage grows
5. **Logs**: Need proper log rotation

## Quick Wins for Conversation Memory

1. **Session Recovery**: Store session IDs in localStorage on client
2. **Graceful Reconnect**: WebSocket auto-reconnect maintains session
3. **Future Enhancement**: Add SQLite to persist conversation history

## Todo List

1. Set up DigitalOcean droplet with Ubuntu
2. Install Bun runtime on the server
3. Install and configure Caddy web server
4. Deploy application code and dependencies
5. Configure environment variables and API keys
6. Set up process management with PM2
7. Configure firewall and security settings
8. Set up Cloudflare DNS and proxy settings
9. Test WebSocket connections and tool execution
10. Implement conversation persistence strategy