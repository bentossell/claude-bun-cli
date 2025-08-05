# claude-bun-cli

A web-based interface for Claude Code SDK with WebSocket streaming support.

## Local Development

To install dependencies:

```bash
bun install
```

To run locally:

```bash
bun run src/server.ts
# or
bun run index.ts
```

Visit http://localhost:3000

## Production Deployment

### Security Setup

This app runs as a non-root user in production for enhanced security:

1. **Initial server setup** (run once):
   ```bash
   ./setup-non-root.sh
   ```

2. **Deploy updates**:
   ```bash
   ./deploy-non-root.sh
   ```

### Security Features

- Runs as dedicated `claude-app` user (non-root)
- Uses `bypassPermissions` mode to prevent SDK hanging
- Sandbox directories isolated per workspace
- Command allowlist in `.claude/settings.json`

### Architecture

- **Backend**: Bun + WebSocket server
- **Frontend**: Vanilla JS with real-time streaming
- **AI**: Claude Code SDK integration
- **Hosting**: DigitalOcean with Caddy reverse proxy

This project was created using `bun init` in bun v1.2.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
