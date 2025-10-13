#!/bin/bash

# Script برای تست تنظیمات سرور Bahamm
# این script را روی سرور اجرا کنید تا مطمئن شوید همه چیز درست کار می‌کند

echo "========================================="
echo "Testing Bahamm Server Setup"
echo "========================================="
echo ""

ERRORS=0
WARNINGS=0

# رنگ‌ها برای خروجی
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# تابع برای نمایش نتایج
print_test() {
    local status=$1
    local message=$2
    
    if [ "$status" == "OK" ]; then
        echo -e "${GREEN}✅ OK${NC}: $message"
    elif [ "$status" == "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
        ((WARNINGS++))
    else
        echo -e "${RED}❌ ERROR${NC}: $message"
        ((ERRORS++))
    fi
}

# 1. بررسی Backend Process
echo "1. Checking Backend Process..."
if pgrep -f "uvicorn main:app" > /dev/null; then
    PID=$(pgrep -f "uvicorn main:app")
    print_test "OK" "Backend is running (PID: $PID)"
else
    print_test "ERROR" "Backend is NOT running"
fi
echo ""

# 2. بررسی Backend Port
echo "2. Checking Backend Port (8001)..."
if ss -tlnp 2>/dev/null | grep -q ":8001 " || netstat -tlnp 2>/dev/null | grep -q ":8001 "; then
    print_test "OK" "Port 8001 is listening"
else
    print_test "ERROR" "Port 8001 is NOT listening"
fi
echo ""

# 3. بررسی Frontend Port
echo "3. Checking Frontend Port (8000)..."
if ss -tlnp 2>/dev/null | grep -q ":8000 " || netstat -tlnp 2>/dev/null | grep -q ":8000 "; then
    print_test "OK" "Port 8000 is listening"
else
    print_test "WARN" "Port 8000 is NOT listening (Frontend may not be running)"
fi
echo ""

# 4. بررسی Nginx
echo "4. Checking Nginx..."
if systemctl is-active --quiet nginx; then
    print_test "OK" "Nginx is running"
    
    # بررسی کانفیگ nginx
    if nginx -t 2>&1 | grep -q "successful"; then
        print_test "OK" "Nginx config is valid"
    else
        print_test "ERROR" "Nginx config has errors"
    fi
else
    print_test "ERROR" "Nginx is NOT running"
fi
echo ""

# 5. تست Backend Health Endpoint
echo "5. Testing Backend Health (localhost:8001)..."
if curl -s -f http://127.0.0.1:8001/api/health > /dev/null 2>&1; then
    print_test "OK" "Backend health endpoint is responding"
else
    print_test "ERROR" "Backend health endpoint is NOT responding"
fi
echo ""

# 6. تست Backend از طریق Nginx
echo "6. Testing Backend through Nginx..."
if curl -s -f https://bahamm.ir/backend/api/health > /dev/null 2>&1 || curl -s -f http://localhost/backend/api/health > /dev/null 2>&1; then
    print_test "OK" "Backend accessible through Nginx"
else
    print_test "ERROR" "Backend NOT accessible through Nginx"
fi
echo ""

# 7. تست API admin endpoint
echo "7. Testing Admin API endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/admin/group-buys?limit=1 2>/dev/null)
if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "401" ]; then
    print_test "OK" "Admin API endpoint is responding (HTTP $RESPONSE)"
else
    print_test "ERROR" "Admin API endpoint returned HTTP $RESPONSE"
fi
echo ""

# 8. بررسی SSL Certificate
echo "8. Checking SSL Certificate..."
if [ -f "/etc/letsencrypt/live/bahamm.ir/fullchain.pem" ]; then
    print_test "OK" "SSL certificate exists"
    
    # بررسی تاریخ انقضا
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/bahamm.ir/fullchain.pem 2>/dev/null | cut -d= -f2)
    if [ ! -z "$EXPIRY" ]; then
        print_test "OK" "SSL expires: $EXPIRY"
    fi
else
    print_test "WARN" "SSL certificate not found (might be in different location)"
fi
echo ""

# 9. بررسی Database
echo "9. Checking Database..."
if [ -f "bahamm1.db" ]; then
    print_test "OK" "Database file exists"
else
    print_test "WARN" "Database file not found in current directory"
fi
echo ""

# 10. بررسی Log Files
echo "10. Checking Log Files..."
if [ -d "logs" ]; then
    print_test "OK" "Logs directory exists"
    
    # بررسی سایز لاگ‌ها
    if [ -f "logs/backend.log" ]; then
        SIZE=$(du -h logs/backend.log | cut -f1)
        print_test "OK" "Backend log exists (size: $SIZE)"
    else
        print_test "WARN" "Backend log not found"
    fi
else
    print_test "WARN" "Logs directory not found"
fi
echo ""

# 11. بررسی Disk Space
echo "11. Checking Disk Space..."
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_test "OK" "Disk usage: ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -lt 90 ]; then
    print_test "WARN" "Disk usage: ${DISK_USAGE}% (getting high)"
else
    print_test "ERROR" "Disk usage: ${DISK_USAGE}% (critically high)"
fi
echo ""

# 12. بررسی Memory
echo "12. Checking Memory..."
if command -v free &> /dev/null; then
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    if [ "$MEM_USAGE" -lt 80 ]; then
        print_test "OK" "Memory usage: ${MEM_USAGE}%"
    else
        print_test "WARN" "Memory usage: ${MEM_USAGE}% (high)"
    fi
else
    print_test "WARN" "Cannot check memory (free command not found)"
fi
echo ""

# 13. تست کامل از خارج (اگر دامنه در دسترس است)
echo "13. Testing External Access..."
if curl -s -f -I https://bahamm.ir > /dev/null 2>&1; then
    print_test "OK" "Website accessible from internet"
else
    print_test "WARN" "Cannot verify external access (might be normal if testing locally)"
fi
echo ""

# خلاصه نتایج
echo "========================================="
echo "Test Summary"
echo "========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✅${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}Tests completed with $WARNINGS warning(s) ⚠️${NC}"
else
    echo -e "${RED}Tests completed with $ERRORS error(s) and $WARNINGS warning(s) ❌${NC}"
fi
echo ""

# پیشنهادات
if [ $ERRORS -gt 0 ]; then
    echo "Troubleshooting suggestions:"
    echo "1. Check backend logs: tail -f logs/backend.log"
    echo "2. Check nginx logs: sudo tail -f /var/log/nginx/bahamm_error.log"
    echo "3. Restart backend: pkill -f uvicorn && ./start_backend_production.sh"
    echo "4. Restart nginx: sudo systemctl restart nginx"
    echo "5. Check systemd service: sudo systemctl status bahamm-backend"
    echo ""
fi

exit $ERRORS

