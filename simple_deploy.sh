#!/bin/bash

echo "Simple Docker Deployment for Bahamm"
echo "===================================="

cd /srv/app/frontend

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Build and start containers
echo "Building and starting containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for services to start..."
sleep 15

echo ""
echo "Container status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Done! Check logs with:"
echo "docker-compose -f docker-compose.prod.yml logs"

