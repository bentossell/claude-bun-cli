#!/bin/bash
export PATH="/root/.bun/bin:$PATH"
cd /root/claude-bun-cli
exec /root/.bun/bin/bun run src/server.ts