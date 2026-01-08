# Security Incident Runbook: High-CPU/RAM Backdoor (Ubuntu)

This runbook targets the indicators you reported:

- `/tmp/fghgf -c /tmp/<something>.json -B` (common crypto-miner style)
- `/etc/profile.d/env.sh` containing `export HOME=/tmp`
- `nohup ~/.local/share/.r0qsv8h1/.../node ~/.local/share/.r0qsv8h1/...js ... &`

## 0) Priority: Assume full compromise

If you see `/etc/profile.d/env.sh` being modified, assume **root-level persistence**. The safest route is **rebuild the VPS from a clean image** and redeploy, after rotating credentials.

If you must keep the box online briefly, do the containment steps below first.

## 1) Containment (stop the bleeding)

Run these on the server (SSH as a sudo-capable user):

```bash
set -eu

echo "### Top memory & CPU"
ps aux --sort=-%mem | head -n 15
ps aux --sort=-%cpu | head -n 15

echo
echo "### Look for known IoCs"
ps auxf | egrep -i '(/tmp/fghgf|ijnegrrinje\.json|\.r0qsv8h1|fvq2lzl64|nohup .*node .*\.js|export HOME=/tmp|/etc/profile\.d/env\.sh)' || true
```

If you identify the malicious PIDs (example: `1505`), immediately stop them:

```bash
sudo kill -STOP <PID> 2>/dev/null || true
sudo kill -9 <PID> 2>/dev/null || true
```

If there are multiple:

```bash
sudo pkill -f '/tmp/fghgf' 2>/dev/null || true
pkill -f '\.r0qsv8h1' 2>/dev/null || true
pkill -f 'fvq2lzl64e\.js' 2>/dev/null || true
```

## 2) Eradication: remove persistence + payloads

### 2.1 Remove the global profile backdoor

```bash
if [ -f /etc/profile.d/env.sh ]; then
  echo "Found /etc/profile.d/env.sh:"
  sudo sed -n '1,120p' /etc/profile.d/env.sh
  echo "Removing it..."
  sudo rm -f /etc/profile.d/env.sh
fi

echo "Re-scan /etc/profile.d for suspicious changes:"
sudo ls -la /etc/profile.d
sudo grep -R --line-number --ignore-case 'HOME=/tmp|/tmp' /etc/profile.d 2>/dev/null || true
```

### 2.2 Remove /tmp payloads

```bash
sudo ls -la /tmp | head -n 200
sudo rm -f /tmp/fghgf 2>/dev/null || true
sudo rm -f /tmp/ijnegrrinje.json 2>/dev/null || true
sudo find /tmp -maxdepth 1 -type f -name '*.json' -mmin -1440 -ls 2>/dev/null || true
```

### 2.3 Remove the hidden node runner in the ubuntu home directory

```bash
TARGET_DIR="/home/ubuntu/.local/share/.r0qsv8h1"
if [ -d "$TARGET_DIR" ]; then
  echo "Found $TARGET_DIR, listing:"
  sudo ls -la "$TARGET_DIR" | head -n 200 || true
  echo "Killing processes that reference it:"
  sudo pkill -f "$TARGET_DIR" 2>/dev/null || true
  echo "Removing directory:"
  sudo rm -rf "$TARGET_DIR"
fi
```

## 3) Hunt other persistence locations (high value)

Run all of the following:

```bash
echo "### systemd units (system scope)"
sudo systemctl list-unit-files --type=service | egrep -i '(r0qsv8h1|tmp/|node|fghgf)' || true
sudo systemctl list-units --type=service --all | egrep -i '(r0qsv8h1|tmp/|node|fghgf)' || true

echo
echo "### timers"
sudo systemctl list-timers --all | egrep -i '(r0qsv8h1|tmp/|node|fghgf)' || true

echo
echo "### cron (system + users)"
sudo ls -la /etc/cron.* /var/spool/cron /var/spool/cron/crontabs 2>/dev/null || true
sudo grep -R --line-number --ignore-case '(r0qsv8h1|/tmp/|fghgf|nohup|node .*\.js)' /etc/cron* /var/spool/cron* 2>/dev/null || true
crontab -l 2>/dev/null || true
sudo crontab -l 2>/dev/null || true

echo
echo "### bash/profile persistence (ubuntu user)"
sudo grep -nE '(r0qsv8h1|/tmp/|fghgf|nohup|node .*\.js)' /home/ubuntu/.bashrc /home/ubuntu/.profile /home/ubuntu/.bash_profile 2>/dev/null || true
```

If you find any suspicious units/cron entries, remove them (don’t just stop them):
- **systemd**: `sudo systemctl disable --now <unit>` then remove the unit file from `/etc/systemd/system/` and `sudo systemctl daemon-reload`
- **cron**: remove the line(s), then `sudo systemctl restart cron`

## 4) Credentials + access rotation (do this even if you “fixed it”)

At minimum:
- Rotate the server SSH keys (remove unknown keys from `~/.ssh/authorized_keys` for **root** and **ubuntu**).
- In GitHub, rotate secrets used by `.github/workflows/deploy.yml` (`SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY`).
- Disable password SSH logins and root SSH login (recommended):
  - Set `PasswordAuthentication no` and `PermitRootLogin no` in `/etc/ssh/sshd_config`
  - `sudo systemctl restart ssh`

## 5) Recommendation: rebuild

If you saw `/etc/profile.d/env.sh` or anything in `/etc/cron*` / systemd you didn’t create, treat the machine as untrusted:
- Reimage/rebuild the VPS
- Re-deploy the app
- Restore only necessary data from backups (database, uploads), not the whole disk


























