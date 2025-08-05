# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Bun-based web application that provides a WebSocket interface to the Claude Code SDK. It allows users to interact with Claude through a web UI, with Claude able to edit files, run commands, and perform development tasks in isolated sandbox environments.

**Live at**: https://openode.ai

## Architecture

### Core Components

1. **WebSocket Server** (`src/server.ts`)
   - Runs on port 3000 behind Caddy reverse proxy
   - Handles WebSocket connections at `/chat` endpoint
   - Serves static files (HTML/JS) from `/public` directory
   - Creates isolated sandbox workspaces in `./sandbox/` for each session
   - Manages Claude SDK sessions with unique session IDs

2. **Claude SDK Integration** (`src/claude.ts`)
   - `ClaudeSDKSession` class wraps the Claude Code SDK using the `query` function
   - Configured with `permissionMode: "bypassPermissions"` to prevent hanging in non-interactive mode
   - Uses Claude Sonnet model by default
   - Runs with `allowedTools: ["*"]` but constrained by `.claude/settings.json`
   - Streams SDK messages to WebSocket clients

3. **Web Client** (`public/index.html`, `public/app.js`)
   - Modern chat UI with real-time message streaming
   - WebSocket auto-reconnection support
   - Handles assistant responses, tool calls, and system messages
   - Each client session gets a unique UUID

### Message Flow

1. **User Input**: Client sends `{ type: "prompt", session, workspace, text }` via WebSocket
2. **SDK Processing**: Server creates/retrieves Claude SDK session and streams the query
3. **Response Streaming**: SDK messages are converted to client-friendly format:
   - `assistant_text_delta`: Incremental text from Claude
   - `tool_call`: Tool usage notifications (e.g., "Using Edit: file.js")
   - `tool_result`: Tool execution results
   - `done`: Conversation completion with token usage stats

### Security Model

#### Production Environment (DigitalOcean)
- **User**: Runs as `claude-app` (non-root) with limited permissions
- **Systemd Service**: Managed by `claude-app.service` with security restrictions
- **File Access**: Limited to `/home/claude-app/app` directory
- **Network**: Behind Caddy reverse proxy with HTTPS/WSS

#### Permission Configuration
- **SDK Mode**: `bypassPermissions` - Required for non-interactive operation
- **Command Allowlist**: `.claude/settings.json` defines:
  - Allowed tools and commands (file operations, git, npm, safe bash commands)
  - Explicitly denied dangerous operations (sudo, rm -rf /, system modifications)

#### Isolation
- Each workspace gets its own sandbox directory
- Claude cannot access:
  - System files or other users' data
  - Server configuration files
  - Other workspaces/sessions

## Key Commands

### Local Development
```bash
# Install dependencies
bun install

# Run locally (http://localhost:3000)
bun run src/server.ts
# or
bun run index.ts
```

### Production Deployment
```bash
# Initial setup (run once as root)
./setup-non-root.sh

# Deploy updates
./deploy-non-root.sh

# Check service status
ssh -i ~/.ssh/openode-droplet-key root@164.90.137.5 'sudo systemctl status claude-app'

# View logs
ssh -i ~/.ssh/openode-droplet-key root@164.90.137.5 'sudo journalctl -u claude-app -f'
```

## File Structure

```
.
├── src/
│   ├── server.ts        # WebSocket server and request handling
│   ├── claude.ts        # Claude SDK integration
│   └── persistence.ts   # Session persistence (future use)
├── public/
│   ├── index.html       # Web UI
│   └── app.js          # Client-side WebSocket handling
├── .claude/
│   └── settings.json    # Tool/command permissions
├── sandbox/             # Isolated workspaces (gitignored)
└── deployment scripts   # setup-non-root.sh, deploy-non-root.sh
```

## Environment Variables

- `ANTHROPIC_API_KEY`: Required for Claude SDK authentication
- `NODE_ENV`: Set to "production" in systemd service

## Current Limitations

1. **No Interactive Permissions**: The SDK runs in non-interactive mode, so permission prompts are not possible. This is why `bypassPermissions` is required.
2. **Session Persistence**: Sessions are stored in memory and lost on server restart
3. **No User Authentication**: Anyone can access and use the service

## Development Guidelines

1. **Security First**: Always consider the security implications of changes
2. **Maintain Isolation**: Ensure workspaces remain isolated
3. **Test Locally**: Test changes locally before deploying
4. **Update Documentation**: Keep this file updated with architectural changes

## Monitoring

- Service logs: `journalctl -u claude-app -f`
- Process status: `systemctl status claude-app`
- Port usage: `lsof -i :3000`

## Important Notes

- The app intentionally uses `bypassPermissions` because the SDK's `query()` function runs in non-interactive mode and would hang waiting for permission prompts that can never be answered
- The non-root user setup is critical for security - Claude can only affect files within the app's directory structure
- Users' local computers are completely safe - Claude only operates on the server's sandbox directories