#!/bin/bash

# Script برای آپلود فایل‌های راه‌حل به سرور
# این script در Linux/Mac اجرا می‌شود

echo "========================================="
echo "Uploading Solution Files to Server"
echo "========================================="
echo ""

# رنگ‌ها
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# درخواست اطلاعات سرور
echo -e "${YELLOW}Please enter server details:${NC}"
echo ""

read -p "Server username (e.g., root or your-user): " SERVER_USER
read -p "Server hostname or IP (e.g., bahamm.ir or 1.2.3.4): " SERVER_HOST
read -p "Target path on server (e.g., /root/final_bahamm): " SERVER_PATH

echo ""
echo -e "${GREEN}Uploading to: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}${NC}"
echo ""

# لیست فایل‌ها برای آپلود
FILES=(
    "nginx_server.conf"
    "start_backend_production.sh"
    "bahamm-backend.service"
    "test_server_setup.sh"
    "SERVER_SETUP_QUICKSTART.md"
    "SERVER_404_FIX_GUIDE.md"
    "امروز_حل_شد_404.md"
)

# بررسی وجود scp
if ! command -v scp &> /dev/null; then
    echo -e "${RED}ERROR: scp command not found!${NC}"
    echo -e "${YELLOW}Please install openssh-client${NC}"
    exit 1
fi

# بررسی وجود فایل‌ها
MISSING_FILES=()
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: Some files are missing:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "  ${RED}- $file${NC}"
    done
    exit 1
fi

echo -e "${GREEN}All files found. Starting upload...${NC}"
echo ""

# آپلود فایل‌ها
SUCCESS=0
FAILED=0

for file in "${FILES[@]}"; do
    echo -n "Uploading: $file ... "
    
    if scp "$file" "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/" &> /dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
        ((SUCCESS++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
    fi
done

echo ""
echo "========================================="
echo "Upload Summary"
echo "========================================="
echo -e "${GREEN}Successful: $SUCCESS${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Failed: $FAILED${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All files uploaded successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${CYAN}1. Connect to server: ssh ${SERVER_USER}@${SERVER_HOST}${NC}"
    echo -e "${CYAN}2. Go to project: cd ${SERVER_PATH}${NC}"
    echo -e "${CYAN}3. Read guide: cat SERVER_SETUP_QUICKSTART.md${NC}"
    echo -e "${CYAN}4. Follow the steps!${NC}"
else
    echo -e "${RED}⚠️  Some files failed to upload${NC}"
    echo -e "${YELLOW}Please check your SSH connection and try again${NC}"
fi

echo ""

