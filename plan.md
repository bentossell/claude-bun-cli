# Security Update Plan: Non-Root User + bypassPermissions

## Overview
Update the production deployment to run as a non-root user with `bypassPermissions` mode to balance security and functionality for the Claude Code SDK in our web application.

## Current State
- Running as root user on DigitalOcean droplet
- Using `permissionMode: "default"` which causes SDK to hang waiting for permissions
- Web UI cannot handle permission prompts (SDK limitation)

## Target State
- Run as dedicated non-root user (`claude-app`)
- Use `permissionMode: "bypassPermissions"` to prevent hanging
- Implement security boundaries through Linux user permissions
- Add `.claude/settings.json` for additional safety

## Implementation Steps

### 1. Server Setup - Create Non-Root User
- Create dedicated user `claude-app` with minimal permissions
- Set up proper directory ownership
- Configure systemd service to run as `claude-app`

### 2. Update Deployment Scripts
- Modify `deploy.sh` to use non-root user
- Update PM2 configuration to run as `claude-app`
- Ensure proper file permissions during deployment

### 3. Update Application Code
- Change `permissionMode` from "default" to "bypassPermissions"
- Add `.claude/settings.json` with safe command allowlist
- Update CLAUDE.md documentation

### 4. Security Hardening
- Restrict `claude-app` user permissions
- Ensure sandbox directories have proper ownership
- Consider network restrictions (optional)

## Security Implications

### What Claude CAN Do
- Read/write/delete files in sandbox directories
- Execute commands as `claude-app` user
- Make network requests
- Access application code and environment variables

### What Claude CANNOT Do
- Access system files or other users' data
- Install system packages
- Bind to privileged ports
- Affect system services

## Rollback Plan
If issues arise:
1. SSH as root to server
2. Stop PM2 process
3. Revert code changes
4. Restart with previous configuration

## Testing Plan
1. Test basic functionality (file operations, command execution)
2. Verify permission boundaries (try accessing system files)
3. Test WebSocket connections and SDK streaming
4. Monitor for any permission-related errors

## Timeline
- Setup: 30 minutes
- Testing: 30 minutes
- Deployment: 15 minutes
- Monitoring: Ongoing

## Success Criteria
- [ ] App runs successfully as non-root user
- [ ] Claude can edit files and run commands without hanging
- [ ] System files remain protected
- [ ] No degradation in user experience