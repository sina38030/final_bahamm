# SERVER SECURITY & COMPROMISE CHECK GUIDE

## 🚨 IMMEDIATE CHECKS - Run These First

### Option 1: Automated Full Scan (Recommended)
```powershell
.\check_server_security.ps1
```

### Option 2: Manual SSH Commands

#### 1. Check Memory Usage (Most Important for Low RAM)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "free -h && echo '---' && ps aux --sort=-%mem | head -20"
```

#### 2. Check for Crypto Miners (Common cause of high resource usage)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "ps aux | grep -iE 'xmrig|minerd|cpuminer|cryptonight|stratum|kdevtmpfsi|kinsing|xmr|monero' | grep -v grep"
```

#### 3. Check Network Connections (Look for suspicious IPs)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "netstat -antp 2>/dev/null | grep ESTABLISHED | wc -l && echo '---' && netstat -ntu | awk '{print \$5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20"
```

#### 4. Check CPU Usage
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "top -bn1 | head -20"
```

#### 5. Check for Unauthorized Users/Logins
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "w && echo '---' && last -n 20"
```

#### 6. Check Failed Login Attempts (Brute Force Detection)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo grep 'Failed password' /var/log/auth.log | tail -50"
```

#### 7. Check Listening Ports
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo netstat -tulpn | grep LISTEN"
```

#### 8. Check Suspicious Cron Jobs
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo crontab -l && for user in \$(cut -f1 -d: /etc/passwd); do echo \"User: \$user\"; sudo crontab -u \$user -l 2>/dev/null; done"
```

#### 9. Check Recent File Modifications in /tmp
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo find /tmp -type f -mtime -1 -ls 2>/dev/null"
```

#### 10. Check PM2 Processes
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 list && pm2 monit"
```

---

## 🔍 WHAT TO LOOK FOR

### Signs of Compromise:

1. **High Memory/CPU Usage**
   - Unknown processes consuming resources
   - Processes with random names (e.g., `kdevtmpfsi`, `kinsing`)
   - Multiple instances of same process

2. **Suspicious Network Activity**
   - Hundreds of connections to unknown IPs
   - Connections to known mining pools (ports 3333, 4444, 5555, 7777)
   - Connections to suspicious countries/IPs

3. **Unauthorized Access**
   - Unknown users logged in
   - Login attempts from unknown IPs
   - Many failed SSH login attempts

4. **Suspicious Files**
   - Hidden files in /tmp, /var/tmp
   - Recently modified system files
   - Scripts with obfuscated code (base64, eval)

5. **Unauthorized Cron Jobs**
   - Jobs downloading/executing scripts from internet
   - Jobs running at unusual times

---

## 🛡️ IMMEDIATE ACTIONS IF COMPROMISED

### 1. Stop Suspicious Processes
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo kill -9 <PID>"
```

### 2. Block Suspicious IPs (if found)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo ufw deny from <SUSPICIOUS_IP>"
```

### 3. Remove Suspicious Cron Jobs
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo crontab -e"
# Delete suspicious lines
```

### 4. Check and Clean /tmp
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo rm -rf /tmp/suspicious_file"
```

### 5. Update and Secure System
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo apt update && sudo apt upgrade -y && sudo apt autoremove -y"
```

---

## 🔒 PREVENTIVE MEASURES

### 1. Install Fail2Ban (Prevent Brute Force)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo apt install fail2ban -y && sudo systemctl enable fail2ban && sudo systemctl start fail2ban"
```

### 2. Configure Firewall (UFW)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8001/tcp
sudo ufw --force enable
"
```

### 3. Disable Password Authentication (SSH Key Only)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
"
```

### 4. Install and Run ClamAV (Antivirus)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "
sudo apt install clamav clamav-daemon -y
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl start clamav-freshclam
sudo clamscan -r /home /var/www --infected --remove
"
```

### 5. Install RKHunter (Rootkit Detection)
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "
sudo apt install rkhunter -y
sudo rkhunter --update
sudo rkhunter --check --skip-keypress
"
```

---

## 📊 MONITORING COMMANDS

### Real-time Memory Monitor
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "watch -n 2 free -h"
```

### Real-time Process Monitor
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "htop"
```

### Real-time Network Monitor
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo iftop"
```

### Check Logs Continuously
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo tail -f /var/log/auth.log"
```

---

## 🆘 EMERGENCY RECOVERY

If server is severely compromised:

### 1. Backup Critical Data
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "
cd /home/ubuntu/bahamm-git
tar -czf ~/bahamm_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/bahamm.db backend/.env frontend/.env
"
```

### 2. Download Backup
```powershell
scp -i "C:\Users\User\.ssh\id_rsa" ubuntu@188.121.103.118:~/bahamm_backup_*.tar.gz C:\Projects\final_bahamm\
```

### 3. Consider Server Rebuild
If heavily compromised, may need to rebuild server from scratch and restore from backup.

---

## 📝 QUICK REFERENCE

**Most Common Issues with Low RAM:**
1. Memory leak in application (PM2 processes)
2. Crypto miner malware
3. DDoS attack (too many connections)
4. Runaway processes
5. Insufficient swap space

**Quick Fix for Low RAM:**
```bash
# Restart PM2 processes
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart all"

# Clear cache
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sync && echo 3 | sudo tee /proc/sys/vm/drop_caches"

# Add swap if needed
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
"
```










