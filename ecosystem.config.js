module.exports = {
  apps: [{
    name: 'claude-bun',
    script: '/root/.bun/bin/bun',
    args: 'run /root/claude-bun-cli/src/server.ts',
    env: {
      NODE_ENV: 'production'
    },
    cwd: '/root/claude-bun-cli',
    error_file: '/root/claude-bun-cli/logs/err.log',
    out_file: '/root/claude-bun-cli/logs/out.log',
    time: true,
    autorestart: true,
    max_restarts: 10
  }]
}