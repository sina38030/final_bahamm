#!/bin/bash

cd /srv/app/frontend

echo "Setting up environment and SSL..."

# Create .env.prod file
cat > .env.prod << 'EOF'
# Database Configuration
POSTGRES_USER=bahamm_user
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
POSTGRES_DB=bahamm

# Backend Configuration - generate secure key
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# SMS Provider - you need to update this with actual key
SMS_PROVIDER=melipayamak
MELIPAYAMAK_API_KEY=your_api_key_here

# Frontend URLs (Production)
NEXT_PUBLIC_BACKEND_URL=https://app.bahamm.ir
NEXT_PUBLIC_ADMIN_API_URL=https://app.bahamm.ir
NEXT_PUBLIC_SITE_URL=https://bahamm.ir
NEXT_PUBLIC_FRONTEND_URL=https://bahamm.ir
EOF

# Generate secure passwords
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
SECRET=$(openssl rand -hex 32)

# Update .env.prod with generated values
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASS/" .env.prod
sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET/" .env.prod

echo "✓ .env.prod created with secure passwords"

# Create SSL directory
mkdir -p nginx/ssl

# Check if Let's Encrypt certificates exist
if [ -d "/etc/letsencrypt/live/bahamm.ir" ]; then
    echo "Found Let's Encrypt certificates, copying..."
    sudo cp /etc/letsencrypt/live/bahamm.ir/fullchain.pem nginx/ssl/
    sudo cp /etc/letsencrypt/live/bahamm.ir/privkey.pem nginx/ssl/
    sudo chown -R ubuntu:ubuntu nginx/ssl
    echo "✓ SSL certificates copied"
else
    echo "Let's Encrypt certificates not found, generating self-signed..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout nginx/ssl/privkey.pem \
      -out nginx/ssl/fullchain.pem \
      -subj "/C=IR/ST=Tehran/L=Tehran/O=Bahamm/CN=bahamm.ir" \
      2>/dev/null
    echo "✓ Self-signed SSL certificates generated"
    echo "⚠ For production, you should use Let's Encrypt certificates"
fi

# Create necessary directories
mkdir -p backend/logs backend/uploads backups

echo ""
echo "======================================"
echo "Environment setup complete!"
echo "======================================"
echo ""
echo "Generated credentials:"
echo "Database Password: $DB_PASS"
echo "Secret Key: $SECRET"
echo ""
echo "⚠ IMPORTANT: Update MELIPAYAMAK_API_KEY in .env.prod with your actual API key"
echo ""
echo "To update SMS API key, run:"
echo "nano /srv/app/frontend/.env.prod"
echo ""
echo "Ready to deploy! Run:"
echo "cd /srv/app/frontend && ./deploy.sh"

