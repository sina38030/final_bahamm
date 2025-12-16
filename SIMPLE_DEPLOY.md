# 🚀 راه حل ساده Deploy (بدون GitHub Actions)

## مشکل GitHub Actions:
- خیلی کند (timeout می‌خوره)
- پیچیده
- مشکلات SSH connection

---

## ✅ راه حل 1: اسکریپت Local (10-15 ثانیه)

### استفاده:
```batch
deploy_now_ultra.bat
```

یا:
```powershell
.\deploy_ultra_quick.ps1 "your message"
```

### چی کار می‌کنه:
1. Git push
2. SSH به سرور
3. Git pull
4. PM2 restart

**زمان: 10-15 ثانیه** ⚡

---

## ✅ راه حل 2: Webhook ساده (5 ثانیه!)

### نصب روی سرور (یکبار):

1. SSH به سرور:
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa"
```

2. ساخت webhook script:
```bash
cat > ~/webhook.sh << 'EOF'
#!/bin/bash
cd ~/bahamm-git
git pull -q
pm2 restart all
echo "Deployed at $(date)"
EOF

chmod +x ~/webhook.sh
```

3. اجرا با Python:
```bash
cat > ~/webhook_server.py << 'EOF'
from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/deploy':
            subprocess.run(['/home/ubuntu/webhook.sh'])
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'Deployed!')
        else:
            self.send_response(404)
            self.end_headers()

HTTPServer(('0.0.0.0', 9000), WebhookHandler).serve_forever()
EOF

nohup python3 ~/webhook_server.py > ~/webhook.log 2>&1 &
```

4. تنظیم GitHub Webhook:
- برو: https://github.com/sina38030/final_bahamm/settings/hooks
- Add webhook
- URL: `http://188.121.103.118:9000/deploy`
- Content type: `application/json`
- Events: Just the push event

### نتیجه:
هر بار push می‌زنی، **خودکار در 5 ثانیه deploy می‌شه!**

---

## توصیه من:

**از راه حل 1 استفاده کن** - ساده‌ترین و مطمئن‌ترین!

فقط هر بار:
```batch
deploy_now_ultra.bat
```

و تمام! ✅

