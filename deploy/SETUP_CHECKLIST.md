# Staging Environment Setup Checklist

Use this checklist to ensure you've completed all steps correctly.

## Pre-Deployment

- [ ] You have SSH access to your VPS
- [ ] You know your VPS IP address
- [ ] You have the following running in production:
  - [ ] Backend service at `/srv/bahamm/backend`
  - [ ] Frontend code at `/srv/bahamm/frontend`
  - [ ] Nginx as reverse proxy
  - [ ] PM2 for frontend (or willing to migrate)

## DNS Configuration

- [ ] Added A record: `staging.bahamm.ir` → VPS IP
- [ ] Added A record: `staging-api.bahamm.ir` → VPS IP
- [ ] DNS has propagated (test with `nslookup staging.bahamm.ir`)

## File Deployment

- [ ] Uploaded all files from `deploy/` folder to server
- [ ] Made `setup-staging.sh` executable (`chmod +x`)
- [ ] Made `deploy-to-server.sh` executable (if using)

## Backend Staging Setup

- [ ] `backend-staging.service` copied to `/etc/systemd/system/`
- [ ] Edited service file with correct paths if needed
- [ ] Ran `sudo systemctl daemon-reload`
- [ ] Ran `sudo systemctl enable backend-staging`
- [ ] Ran `sudo systemctl start backend-staging`
- [ ] Verified status: `sudo systemctl status backend-staging`
- [ ] Backend staging is running on port 8002
- [ ] Health check passes: `curl http://127.0.0.1:8002/health`

## Frontend Staging Setup

- [ ] `ecosystem.config.js` copied to `/srv/bahamm/frontend/`
- [ ] Logs directory exists: `/srv/bahamm/logs`
- [ ] Stopped existing PM2 processes: `pm2 stop all`
- [ ] Started with ecosystem: `pm2 start ecosystem.config.js`
- [ ] Saved PM2 config: `pm2 save`
- [ ] Verified status: `pm2 status`
- [ ] Frontend staging is running on port 3001
- [ ] Can access: `curl http://127.0.0.1:3001`

## Nginx Configuration

- [ ] `nginx-staging.conf` copied to `/etc/nginx/sites-available/staging-bahamm`
- [ ] Symlink created to sites-enabled
- [ ] Nginx config tested: `sudo nginx -t`
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Nginx is running: `sudo systemctl status nginx`

## CORS Configuration (Backend)

- [ ] Added staging origins to backend `main.py`:
  - [ ] `http://localhost:3001`
  - [ ] `https://staging.bahamm.ir`
  - [ ] `https://staging-api.bahamm.ir`
- [ ] Restarted backend staging after CORS changes

## Testing

### Local Testing (on server)
- [ ] Backend health: `curl http://127.0.0.1:8002/health`
- [ ] Backend API: `curl http://127.0.0.1:8002/api/health`
- [ ] Frontend: `curl http://127.0.0.1:3001`

### Domain Testing (HTTP)
- [ ] Frontend accessible: `http://staging.bahamm.ir`
- [ ] Backend health: `http://staging-api.bahamm.ir/health`
- [ ] Backend docs: `http://staging-api.bahamm.ir/docs`

### Hot Reload Testing
- [ ] Connected to server via Remote SSH (VS Code/Cursor)
- [ ] Edited a Python file in `/srv/bahamm/backend/`
- [ ] Backend auto-reloaded (check logs)
- [ ] Edited a React file in `/srv/bahamm/frontend/src/`
- [ ] Frontend hot-reloaded in browser

## SSL Configuration (Optional)

- [ ] Installed certbot: `sudo apt install certbot python3-certbot-nginx`
- [ ] Obtained certificates: `sudo certbot --nginx -d staging.bahamm.ir -d staging-api.bahamm.ir`
- [ ] Certificates auto-renew: `sudo certbot renew --dry-run`
- [ ] Frontend accessible: `https://staging.bahamm.ir`
- [ ] Backend accessible: `https://staging-api.bahamm.ir`

## Monitoring Setup

- [ ] Can view backend logs: `sudo journalctl -u backend-staging -f`
- [ ] Can view frontend logs: `pm2 logs frontend-staging`
- [ ] Can view nginx logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Installed monitoring script: `monitor-services.sh`
- [ ] Monitoring script works: `sudo ./monitor-services.sh`

## Documentation

- [ ] Team knows staging URLs
- [ ] Team knows how to access logs
- [ ] Team knows the deployment workflow:
  1. Test in staging
  2. Verify everything works
  3. Run `promote-staging-to-production.sh`

## Final Checks

- [ ] Production services are still running
- [ ] Production URLs still work:
  - [ ] `https://app.bahamm.ir`
  - [ ] `https://api.bahamm.ir`
- [ ] All 4 ports are in use:
  - [ ] Port 3000 (production frontend)
  - [ ] Port 3001 (staging frontend)
  - [ ] Port 8001 (production backend)
  - [ ] Port 8002 (staging backend)

## Quick Test Script

Run this on your server to verify everything:

```bash
#!/bin/bash
echo "Testing all services..."
curl -s http://127.0.0.1:8001/health && echo "✓ Production Backend OK"
curl -s http://127.0.0.1:8002/health && echo "✓ Staging Backend OK"
curl -s http://127.0.0.1:3000 > /dev/null && echo "✓ Production Frontend OK"
curl -s http://127.0.0.1:3001 > /dev/null && echo "✓ Staging Frontend OK"
systemctl is-active --quiet backend && echo "✓ Backend service active"
systemctl is-active --quiet backend-staging && echo "✓ Backend staging active"
systemctl is-active --quiet nginx && echo "✓ Nginx active"
pm2 describe frontend &>/dev/null && echo "✓ PM2 frontend active"
pm2 describe frontend-staging &>/dev/null && echo "✓ PM2 staging active"
```

## Troubleshooting Reference

If something goes wrong:

1. **Backend staging won't start**
   ```bash
   sudo journalctl -u backend-staging -n 50
   sudo lsof -i :8002
   ```

2. **Frontend staging won't start**
   ```bash
   pm2 logs frontend-staging --lines 50
   sudo lsof -i :3001
   ```

3. **Nginx errors**
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Hot reload not working**
   - Check file permissions
   - Ensure correct flags in service files
   - Restart services

## Post-Setup

After everything is working:

- [ ] Documented any custom changes you made
- [ ] Created a git commit (if tracking configs)
- [ ] Notified team about new staging environment
- [ ] Tested a full development cycle:
  1. Edit code via Remote SSH
  2. See changes auto-apply in staging
  3. Test thoroughly
  4. Deploy to production when stable

---

## Success Criteria

✅ **You should be able to:**

1. Edit backend Python files and see changes in ~2 seconds
2. Edit frontend React files and see changes instantly
3. Test at staging.bahamm.ir and staging-api.bahamm.ir
4. Deploy to production only when staging is stable
5. Work without constantly restarting services

✅ **Production should:**

1. Still be running normally
2. Not be affected by staging crashes
3. Be independent of staging

---

**Estimated Time:** 15-30 minutes for full setup

**Difficulty:** Intermediate

**Prerequisite Knowledge:**
- Basic Linux commands
- SSH access
- Understanding of systemd and PM2
- Basic nginx concepts

---

Need help? Check the detailed README.md or quick-commands.md files!


