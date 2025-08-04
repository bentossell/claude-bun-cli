# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Bun-based web application that provides a WebSocket interface to the Claude SDK. It consists of a server that manages Claude SDK sessions and a web UI for interacting with Claude.

## Key Commands

```bash
# Install dependencies
bun install

# Run the server (starts on http://localhost:3000)
bun run index.ts

# Run the main server application
bun run src/server.ts
```

## Architecture

### Core Components

1. **WebSocket Server** (`src/server.ts`)
   - Runs on port 3000
   - Handles WebSocket connections at `/chat` endpoint
   - Serves static files (HTML/JS) from `/public` directory
   - Creates sandboxed workspaces in `./sandbox/` for each session
   - Manages Claude SDK sessions with session IDs

2. **Claude SDK Integration** (`src/claude.ts`)
   - `ClaudeSDKSession` class wraps the Claude Code SDK
   - Configured to run with `permissionMode: bypassPermissions`
   - Uses "sonnet" model by default
   - Streams SDK messages to WebSocket clients

3. **Web Client** (`public/index.html`, `public/app.js`)
   - Modern chat UI with real-time message streaming
   - Handles user messages, assistant responses, tool calls, and system messages
   - Auto-reconnecting WebSocket client
   - Each client gets a unique session ID

### Message Flow

1. Client sends `{ type: "prompt", session, workspace, text }` via WebSocket
2. Server creates/retrieves Claude SDK session
3. SDK responses are streamed and converted to simplified client messages:
   - `assistant_text_delta`: Text streaming from Claude
   - `tool_call`: Tool usage notifications
   - `tool_result`: Tool execution results
   - `done`: Conversation completion with usage stats

### Key Dependencies

- `@anthropic-ai/claude-code`: Claude Code SDK for AI interactions
- `@types/bun`: TypeScript types for Bun runtime
- Uses Bun's built-in WebSocket server and file serving capabilities

## Development Notes

- The application creates workspace directories in `./sandbox/` - these are gitignored
- Log files (`server.log`, `server-debug.log`, `server-sdk.log`) are gitignored
- Test files (`test-*.js`) are gitignored
- TypeScript is configured with strict mode and modern ES features