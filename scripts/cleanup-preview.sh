#!/bin/bash

# Cleanup PR Preview Script
# Usage: ./cleanup-preview.sh <PR_NUMBER>

set -e

PR_NUMBER=$1
PREVIEW_DIR="/home/claude-app/previews/pr-${PR_NUMBER}"
SERVICE_NAME="claude-app-pr-${PR_NUMBER}"

if [ -z "$PR_NUMBER" ]; then
    echo "Usage: $0 <PR_NUMBER>"
    exit 1
fi

echo "🧹 Cleaning up PR #${PR_NUMBER} preview..."

# Stop and disable the service
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "⏹️  Stopping service..."
    sudo systemctl stop ${SERVICE_NAME}
fi

if sudo systemctl is-enabled --quiet ${SERVICE_NAME} 2>/dev/null; then
    sudo systemctl disable ${SERVICE_NAME}
fi

# Remove service file
if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
    echo "🗑️  Removing service file..."
    sudo rm "/etc/systemd/system/${SERVICE_NAME}.service"
    sudo systemctl daemon-reload
fi

# Remove preview directory
if [ -d "$PREVIEW_DIR" ]; then
    echo "📂 Removing preview directory..."
    rm -rf "$PREVIEW_DIR"
fi

echo "✅ Preview cleaned up successfully!"