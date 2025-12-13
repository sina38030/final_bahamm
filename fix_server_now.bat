@echo off
echo ==========================================
echo   BAHAMM.IR Server Fix
echo ==========================================
echo.

REM Configure these before running:
set SERVER=ubuntu@<YOUR_SERVER_IP>
set SSH_KEY=<PATH_TO_YOUR_PRIVATE_KEY>

echo Step 1: Stopping all services...
echo ==========================================
ssh -i "%SSH_KEY%" %SERVER% "sudo systemctl stop nginx; sudo systemctl stop bahamm-backend; pm2 stop all 2>/dev/null || true"
timeout /t 3 >nul

echo.
echo Step 2: Killing stuck processes...
echo ==========================================
ssh -i "%SSH_KEY%" %SERVER% "sudo fuser -k 80/tcp 2>/dev/null || true; sudo fuser -k 443/tcp 2>/dev/null || true; sudo fuser -k 3000/tcp 2>/dev/null || true; sudo fuser -k 8001/tcp 2>/dev/null || true"
timeout /t 2 >nul

echo.
echo Step 3: Starting Backend (port 8001)...
echo ==========================================
ssh -i "%SSH_KEY%" %SERVER% "sudo systemctl start bahamm-backend && sudo systemctl enable bahamm-backend"
timeout /t 3 >nul

echo.
echo Step 4: Checking Backend Status...
ssh -i "%SSH_KEY%" %SERVER% "sudo systemctl is-active bahamm-backend && echo Backend: Running || echo Backend: FAILED"

echo.
echo Step 5: Starting Frontend (port 3000)...
echo ==========================================
ssh -i "%SSH_KEY%" %SERVER% "cd /srv/app/frontend && (pm2 restart bahamm-frontend 2>/dev/null || pm2 start npm --name bahamm-frontend -- start) && pm2 save"
timeout /t 5 >nul

echo.
echo Step 6: Starting Nginx...
echo ==========================================
ssh -i "%SSH_KEY%" %SERVER% "sudo systemctl start nginx && sudo systemctl enable nginx"
timeout /t 2 >nul

echo.
echo Step 7: Verification...
echo ==========================================
ssh -i "%SSH_KEY%" %SERVER% "echo '=== Service Status ==='; sudo systemctl is-active nginx && echo 'Nginx: Running' || echo 'Nginx: FAILED'; sudo systemctl is-active bahamm-backend && echo 'Backend: Running' || echo 'Backend: FAILED'; echo ''; echo '=== Listening Ports ==='; sudo netstat -tlnp | grep -E ':80|:443|:3000|:8001'"

echo.
echo ==========================================
echo   Testing Website...
echo ==========================================
timeout /t 5 >nul

curl -I https://bahamm.ir 2>nul || echo Website not responding yet...

echo.
echo ==========================================
echo   Done! Check https://bahamm.ir
echo ==========================================
echo.
pause

