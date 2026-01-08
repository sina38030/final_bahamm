#!/bin/bash

echo "=========================================="
echo "SERVER SECURITY & RESOURCE CHECK"
echo "=========================================="
echo ""

echo "1. MEMORY USAGE ANALYSIS"
echo "----------------------------------------"
free -h
echo ""
echo "Top 10 Memory Consuming Processes:"
ps aux --sort=-%mem | head -11
echo ""

echo "2. CPU USAGE ANALYSIS"
echo "----------------------------------------"
top -bn1 | head -20
echo ""

echo "3. ACTIVE NETWORK CONNECTIONS"
echo "----------------------------------------"
echo "Established connections:"
netstat -antp 2>/dev/null | grep ESTABLISHED | wc -l
echo ""
echo "All listening ports:"
netstat -tulpn 2>/dev/null | grep LISTEN
echo ""

echo "4. SUSPICIOUS NETWORK CONNECTIONS"
echo "----------------------------------------"
echo "Connections by IP (top 20):"
netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
echo ""

echo "5. CHECK FOR UNUSUAL PROCESSES"
echo "----------------------------------------"
echo "Processes with high CPU:"
ps aux --sort=-%cpu | head -11
echo ""

echo "6. CHECK FOR CRYPTO MINERS"
echo "----------------------------------------"
echo "Searching for common miner processes..."
ps aux | grep -iE 'xmrig|minerd|cpuminer|cryptonight|stratum|kdevtmpfsi|kinsing' | grep -v grep
echo ""

echo "7. CHECK RUNNING SERVICES"
echo "----------------------------------------"
systemctl list-units --type=service --state=running
echo ""

echo "8. CHECK FOR UNAUTHORIZED USERS"
echo "----------------------------------------"
echo "Currently logged in users:"
w
echo ""
echo "Recent login attempts:"
last -n 20
echo ""
echo "Failed login attempts:"
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -20
echo ""

echo "9. CHECK CRON JOBS (potential backdoors)"
echo "----------------------------------------"
echo "Root crontab:"
crontab -l 2>/dev/null
echo ""
echo "All user crontabs:"
for user in $(cut -f1 -d: /etc/passwd); do 
    echo "Crontab for $user:"
    crontab -u $user -l 2>/dev/null
done
echo ""

echo "10. CHECK FOR SUSPICIOUS FILES"
echo "----------------------------------------"
echo "Recently modified files in /tmp:"
find /tmp -type f -mtime -1 2>/dev/null
echo ""
echo "Recently modified files in /var/tmp:"
find /var/tmp -type f -mtime -1 2>/dev/null
echo ""

echo "11. CHECK DISK USAGE"
echo "----------------------------------------"
df -h
echo ""

echo "12. CHECK FOR SUSPICIOUS NETWORK TRAFFIC"
echo "----------------------------------------"
echo "Bandwidth usage per connection (if iftop is installed):"
which iftop >/dev/null 2>&1 && timeout 5 iftop -t -s 5 2>/dev/null || echo "iftop not installed"
echo ""

echo "13. CHECK SYSTEM LOGS FOR ERRORS"
echo "----------------------------------------"
echo "Recent system errors:"
journalctl -p err -n 50 --no-pager 2>/dev/null || dmesg | grep -i error | tail -20
echo ""

echo "14. CHECK FOR ROOTKITS (basic check)"
echo "----------------------------------------"
echo "Checking for common rootkit files..."
ls -la /tmp/.ICE-unix/ /tmp/.X11-unix/ 2>/dev/null
echo ""

echo "15. CHECK DOCKER CONTAINERS (if applicable)"
echo "----------------------------------------"
which docker >/dev/null 2>&1 && docker ps -a || echo "Docker not installed"
echo ""

echo "16. CHECK PM2 PROCESSES"
echo "----------------------------------------"
which pm2 >/dev/null 2>&1 && pm2 list && pm2 monit || echo "PM2 not installed"
echo ""

echo "=========================================="
echo "SCAN COMPLETE"
echo "=========================================="















