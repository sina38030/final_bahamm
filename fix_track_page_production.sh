#!/bin/bash

# اسکریپت برای رفع مشکل Track Page در Production
# این اسکریپت باید روی سرور production اجرا شود

set -e

echo "=============================================="
echo "رفع مشکل Track Page در Production"
echo "=============================================="
echo ""

# رنگ‌ها برای نمایش بهتر
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# مسیر پروژه
PROJECT_DIR="/srv/app"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${YELLOW}مرحله 1: بررسی فایل‌های .env${NC}"
cd "$FRONTEND_DIR"

# بررسی اینکه فایل‌های .env وجود دارند یا نه
if [ -f ".env" ] && [ -f ".env.production" ]; then
    echo -e "${GREEN}✓ فایل‌های .env موجود هستند${NC}"
else
    echo -e "${RED}✗ فایل‌های .env موجود نیستند!${NC}"
    echo "لطفاً ابتدا فایل‌های .env را از repository pull کنید:"
    echo "  cd $PROJECT_DIR"
    echo "  git pull origin main"
    exit 1
fi

echo ""
echo -e "${YELLOW}مرحله 2: نمایش محتوای .env${NC}"
echo "محتوای .env.production:"
cat .env.production
echo ""

echo -e "${YELLOW}مرحله 3: پاک کردن cache و build قدیمی${NC}"
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✓ Cache پاک شد${NC}"
echo ""

echo -e "${YELLOW}مرحله 4: ساخت build جدید (این ممکن است 2-5 دقیقه طول بکشد)${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build با موفقیت ساخته شد${NC}"
else
    echo -e "${RED}✗ خطا در ساخت build!${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}مرحله 5: راه‌اندازی مجدد frontend${NC}"

# بررسی اینکه frontend با چه روشی اجرا می‌شود
if command -v pm2 &> /dev/null; then
    echo "استفاده از PM2 برای restart..."
    
    # بررسی اینکه process با نام frontend وجود دارد
    if pm2 list | grep -q "frontend"; then
        pm2 restart frontend
        echo -e "${GREEN}✓ Frontend با PM2 restart شد${NC}"
    else
        echo -e "${YELLOW}Process با نام 'frontend' یافت نشد. ایجاد process جدید...${NC}"
        pm2 start npm --name "frontend" -- start
        pm2 save
        echo -e "${GREEN}✓ Frontend با PM2 شروع شد${NC}"
    fi
    
    echo ""
    echo "وضعیت PM2:"
    pm2 list
    
elif systemctl is-active --quiet bahamm-frontend 2>/dev/null; then
    echo "استفاده از systemd (bahamm-frontend) برای restart..."
    sudo systemctl restart bahamm-frontend
    echo -e "${GREEN}✓ Frontend با systemd restart شد${NC}"
    echo ""
    echo "وضعیت سرویس:"
    sudo systemctl status bahamm-frontend --no-pager
    
elif systemctl is-active --quiet frontend 2>/dev/null; then
    echo "استفاده از systemd (frontend) برای restart..."
    sudo systemctl restart frontend
    echo -e "${GREEN}✓ Frontend با systemd restart شد${NC}"
    echo ""
    echo "وضعیت سرویس:"
    sudo systemctl status frontend --no-pager
    
else
    echo -e "${RED}✗ هیچ process manager شناخته‌شده‌ای یافت نشد!${NC}"
    echo "لطفاً به صورت دستی frontend را restart کنید"
    exit 1
fi

echo ""
echo "=============================================="
echo -e "${GREEN}مراحل با موفقیت انجام شد!${NC}"
echo "=============================================="
echo ""
echo "برای تست:"
echo "1. به سایت بروید: https://bahamm.ir"
echo "2. وارد صفحه Track یک گروه شوید"
echo "3. بررسی کنید که محصولات، قیمت‌ها و اعضا نمایش داده می‌شوند"
echo ""
echo "برای مشاهده لاگ‌ها:"
if command -v pm2 &> /dev/null; then
    echo "  pm2 logs frontend"
else
    echo "  sudo journalctl -u frontend -f"
    echo "  یا"
    echo "  sudo journalctl -u bahamm-frontend -f"
fi
echo ""
