# Setup GitHub Secrets for Automated Deployment

To enable automated deployments, you need to add these secrets to your GitHub repository.

## Required Secrets

Go to your repository settings: https://github.com/bentossell/claude-bun-cli/settings/secrets/actions

Click "New repository secret" for each of these:

### 1. `DO_SSH_PRIVATE_KEY`
Your SSH private key content:
```bash
cat ~/.ssh/openode-droplet-key
```
Copy the entire output including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`

### 2. `DO_HOST`
```
164.90.137.5
```

### 3. `DO_USER`
```
root
```

## Setting Secrets via GitHub CLI (Alternative)

If you have GitHub CLI installed:

```bash
# Set SSH key
gh secret set DO_SSH_PRIVATE_KEY < ~/.ssh/openode-droplet-key

# Set host
echo "164.90.137.5" | gh secret set DO_HOST

# Set user
echo "root" | gh secret set DO_USER
```

## Verify Secrets

After adding all secrets, you should see 3 secrets in your repository settings:
- ✅ DO_SSH_PRIVATE_KEY
- ✅ DO_HOST  
- ✅ DO_USER

## How It Works

1. When you push to `main` branch, GitHub Actions triggers
2. It connects to your DO server via SSH
3. Deploys the latest code as the `claude-app` user
4. Restarts the service
5. Verifies the deployment worked
6. Rolls back automatically if something fails

## Testing

After setting up secrets:
1. Make a small change (like updating README)
2. Push to main
3. Go to Actions tab to watch deployment: https://github.com/bentossell/claude-bun-cli/actions

## Manual Trigger

You can also trigger deployment manually:
1. Go to Actions tab
2. Select "Deploy to DigitalOcean"
3. Click "Run workflow"