#!/bin/bash

# Bash script to deploy staging configuration to VPS
# Run this from your local machine (Linux/Mac)

set -e

if [ $# -lt 1 ]; then
    echo "Usage: ./deploy-to-server.sh <SERVER_IP> [SERVER_USER]"
    echo "Example: ./deploy-to-server.sh 192.168.1.100 root"
    exit 1
fi

SERVER_IP=$1
SERVER_USER=${2:-root}

echo "================================================"
echo "  Bahamm Staging Deployment to VPS"
echo "================================================"
echo ""
echo "Deploying to: $SERVER_USER@$SERVER_IP"
echo ""

DEPLOY_DIR="staging-setup"

echo "Step 1: Creating directory on server..."
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p /root/$DEPLOY_DIR"

echo "Step 2: Uploading configuration files..."
scp backend-staging.service "$SERVER_USER@$SERVER_IP:/root/$DEPLOY_DIR/"
scp frontend-ecosystem.config.js "$SERVER_USER@$SERVER_IP:/root/$DEPLOY_DIR/"
scp nginx-staging.conf "$SERVER_USER@$SERVER_IP:/root/$DEPLOY_DIR/"
scp setup-staging.sh "$SERVER_USER@$SERVER_IP:/root/$DEPLOY_DIR/"
scp README.md "$SERVER_USER@$SERVER_IP:/root/$DEPLOY_DIR/"

echo ""
echo "✓ Files uploaded successfully!"
echo ""
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. SSH into your server:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo ""
echo "2. Run the setup script:"
echo "   cd /root/$DEPLOY_DIR"
echo "   chmod +x setup-staging.sh"
echo "   sudo ./setup-staging.sh"
echo ""
echo "Or run directly:"
echo "   ssh $SERVER_USER@$SERVER_IP 'cd /root/$DEPLOY_DIR && chmod +x setup-staging.sh && sudo ./setup-staging.sh'"
echo ""
echo "================================================"

# Ask if user wants to run the setup script now
echo ""
read -p "Do you want to run the setup script now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running setup script on server..."
    ssh "$SERVER_USER@$SERVER_IP" "cd /root/$DEPLOY_DIR && chmod +x setup-staging.sh && sudo ./setup-staging.sh"
fi


