#!/bin/bash

# Comprehensive monitoring script for Bahamm services
# Shows status of all production and staging services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Bahamm Services Status Monitor${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to check systemd service
check_systemd_service() {
    local service_name=$1
    local display_name=$2
    
    if systemctl is-active --quiet $service_name; then
        echo -e "${GREEN}✓${NC} $display_name: ${GREEN}Running${NC}"
        
        # Get process info
        local pid=$(systemctl show -p MainPID --value $service_name)
        if [ "$pid" != "0" ]; then
            local uptime=$(ps -p $pid -o etime= 2>/dev/null | xargs)
            local memory=$(ps -p $pid -o rss= 2>/dev/null | awk '{printf "%.1f MB", $1/1024}')
            echo -e "  PID: $pid | Uptime: $uptime | Memory: $memory"
        fi
    else
        echo -e "${RED}✗${NC} $display_name: ${RED}Stopped${NC}"
    fi
}

# Function to check PM2 process
check_pm2_process() {
    local process_name=$1
    local display_name=$2
    
    if pm2 describe $process_name &>/dev/null; then
        local status=$(pm2 describe $process_name | grep 'status' | awk '{print $4}')
        
        if [ "$status" = "online" ]; then
            echo -e "${GREEN}✓${NC} $display_name: ${GREEN}Running${NC}"
            
            # Get process info
            local uptime=$(pm2 describe $process_name | grep 'uptime' | awk '{print $4, $5}')
            local memory=$(pm2 describe $process_name | grep 'memory' | awk '{print $4, $5}')
            echo -e "  Uptime: $uptime | Memory: $memory"
        else
            echo -e "${RED}✗${NC} $display_name: ${RED}$status${NC}"
        fi
    else
        echo -e "${RED}✗${NC} $display_name: ${RED}Not found${NC}"
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service_name=$2
    
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Port $port ($service_name): ${GREEN}Listening${NC}"
    else
        echo -e "${RED}✗${NC} Port $port ($service_name): ${RED}Not listening${NC}"
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local name=$2
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓${NC} $name: ${GREEN}Responding (HTTP $response)${NC}"
    elif [ -n "$response" ]; then
        echo -e "${YELLOW}!${NC} $name: ${YELLOW}HTTP $response${NC}"
    else
        echo -e "${RED}✗${NC} $name: ${RED}No response${NC}"
    fi
}

echo -e "${YELLOW}Backend Services${NC}"
echo "-----------------------------------"
check_systemd_service "backend" "Production Backend"
check_systemd_service "backend-staging" "Staging Backend"
echo ""

echo -e "${YELLOW}Frontend Services${NC}"
echo "-----------------------------------"
check_pm2_process "frontend" "Production Frontend"
check_pm2_process "frontend-staging" "Staging Frontend"
echo ""

echo -e "${YELLOW}Web Server${NC}"
echo "-----------------------------------"
check_systemd_service "nginx" "Nginx"
echo ""

echo -e "${YELLOW}Port Status${NC}"
echo "-----------------------------------"
check_port "3000" "Frontend Production"
check_port "3001" "Frontend Staging"
check_port "8001" "Backend Production"
check_port "8002" "Backend Staging"
check_port "80" "HTTP"
check_port "443" "HTTPS"
echo ""

echo -e "${YELLOW}Health Checks${NC}"
echo "-----------------------------------"
test_endpoint "http://127.0.0.1:8001/health" "Backend Production"
test_endpoint "http://127.0.0.1:8002/health" "Backend Staging"
test_endpoint "http://127.0.0.1:3000" "Frontend Production"
test_endpoint "http://127.0.0.1:3001" "Frontend Staging"
echo ""

echo -e "${YELLOW}Disk Usage${NC}"
echo "-----------------------------------"
df -h / | tail -1 | awk '{print "Root: " $3 " used / " $2 " total (" $5 " used)"}'
if [ -d "/srv/bahamm" ]; then
    du -sh /srv/bahamm 2>/dev/null | awk '{print "Bahamm Directory: " $1}'
fi
echo ""

echo -e "${YELLOW}Memory Usage${NC}"
echo "-----------------------------------"
free -h | grep Mem | awk '{print "Total: " $2 " | Used: " $3 " | Free: " $4 " | Available: " $7}'
echo ""

echo -e "${YELLOW}Recent Errors (Last 10 minutes)${NC}"
echo "-----------------------------------"

# Check systemd services for errors
echo "Backend Production:"
journalctl -u backend --since "10 minutes ago" --no-pager --grep "ERROR|error|Error" | tail -3 || echo "  No recent errors"

echo ""
echo "Backend Staging:"
journalctl -u backend-staging --since "10 minutes ago" --no-pager --grep "ERROR|error|Error" | tail -3 || echo "  No recent errors"

echo ""
echo "Nginx:"
journalctl -u nginx --since "10 minutes ago" --no-pager --grep "ERROR|error|Error" | tail -3 || echo "  No recent errors"

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  End of Status Report${NC}"
echo -e "${BLUE}================================================${NC}"

# Quick command hints
echo ""
echo -e "${YELLOW}Quick Commands:${NC}"
echo "  View logs:"
echo "    sudo journalctl -u backend-staging -f"
echo "    pm2 logs frontend-staging"
echo ""
echo "  Restart services:"
echo "    sudo systemctl restart backend-staging"
echo "    pm2 restart frontend-staging"
echo ""
echo "  Full status:"
echo "    sudo systemctl status backend-staging"
echo "    pm2 status"


