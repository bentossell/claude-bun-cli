# Automated Deployment System

This repository now has fully automated deployment to DigitalOcean. Any changes pushed to the `main` branch will automatically deploy to production at https://openode.ai.

## How It Works

### 1. **Automatic Deployment on Push**
- Push code to any branch
- Create PR and review changes
- Merge to `main`
- GitHub Actions automatically deploys within 2-3 minutes
- No manual intervention required

### 2. **Deployment Process**
1. GitHub Actions connects to DO server via SSH
2. Backs up current deployment
3. Deploys new code to `/home/claude-app/app`
4. Installs dependencies
5. Restarts the `claude-app` service
6. Verifies deployment succeeded
7. Rolls back automatically if deployment fails

### 3. **Health Monitoring**
- Automatic health checks run every hour
- If site goes down, attempts auto-recovery
- Creates GitHub issue if recovery fails
- You'll get notified of any production issues

## Setup Required (One Time)

### Add GitHub Secrets

1. Go to: https://github.com/bentossell/claude-bun-cli/settings/secrets/actions
2. Add these secrets:

**DO_SSH_PRIVATE_KEY**
```bash
cat ~/.ssh/openode-droplet-key
```

**DO_HOST**
```
164.90.137.5
```

**DO_USER**
```
root
```

### Or use GitHub CLI:
```bash
gh secret set DO_SSH_PRIVATE_KEY < ~/.ssh/openode-droplet-key
echo "164.90.137.5" | gh secret set DO_HOST
echo "root" | gh secret set DO_USER
```

## Mobile Workflow

Perfect for working from your phone:

1. **Edit on GitHub Mobile App**
   - Make changes directly in the app
   - Commit to a new branch
   - Create PR
   - Merge when ready

2. **Use GitHub Web**
   - Edit files at github.com
   - Use the web editor
   - Commit and deployment happens automatically

3. **Use Codespaces**
   - Full VS Code in browser
   - Works on mobile browsers
   - Changes deploy automatically on merge

## Monitoring Deployments

### View Deployment Status
- Go to: https://github.com/bentossell/claude-bun-cli/actions
- Click on latest "Deploy to DigitalOcean" run
- Watch real-time logs

### Get Notifications
- GitHub will email you if deployment fails
- Health check creates issues for downtime
- Enable push notifications on GitHub mobile app

## Manual Controls

### Trigger Deployment Manually
1. Go to [Actions](https://github.com/bentossell/claude-bun-cli/actions)
2. Select "Deploy to DigitalOcean"
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow"

### Run Health Check Manually
1. Go to [Actions](https://github.com/bentossell/claude-bun-cli/actions)
2. Select "Health Check"
3. Click "Run workflow"

## Rollback Process

If something goes wrong:

### Automatic Rollback
- Deployment automatically rolls back if the service fails to start
- Previous version is restored
- You'll be notified of the failure

### Manual Rollback
```bash
ssh root@164.90.137.5
cd /home/claude-app
sudo mv app app.broken
sudo mv app.backup app
sudo systemctl restart claude-app
```

## Security Features

- Deployments run as `claude-app` user (non-root)
- SSH key is stored encrypted in GitHub secrets
- Automatic cleanup of old deployments
- Service verification before confirming deployment

## Troubleshooting

### Deployment Fails
1. Check Actions tab for error logs
2. SSH to server and check: `sudo journalctl -u claude-app -f`
3. Rollback is automatic if service won't start

### Site Goes Down
1. Health check will attempt auto-recovery
2. Check for GitHub issue created by health check
3. Manual fix: `ssh root@164.90.137.5 'sudo systemctl restart claude-app'`

### Update Deployment Config
- Edit `.github/workflows/deploy.yml`
- Changes take effect on next deployment
- No server access needed

## Best Practices

1. **Always test locally first**
   ```bash
   bun run src/server.ts
   ```

2. **Use feature branches**
   - Create branch for new features
   - Test thoroughly
   - Merge to main when ready

3. **Monitor after deployment**
   - Check Actions tab
   - Visit https://openode.ai
   - Watch for issues/notifications

## What Can Go Wrong?

- **Service won't start**: Usually missing dependencies or syntax errors
- **Port conflicts**: Old service still running
- **Permission issues**: Files owned by wrong user
- **API key missing**: Need to restore from backup

All of these are handled automatically by the deployment system!

## Future Improvements

- [ ] Slack/Discord notifications
- [ ] Staging environment
- [ ] Database backup automation
- [ ] Performance monitoring
- [ ] Automatic dependency updates