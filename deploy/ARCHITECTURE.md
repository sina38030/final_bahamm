# Bahamm Staging + Production Architecture

## Overview

This document shows how production and staging environments coexist on the same VPS.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          YOUR VPS SERVER                             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                     NGINX (Port 80/443)                     │    │
│  │                   Reverse Proxy / SSL                       │    │
│  └─────┬──────────────┬──────────────┬──────────────┬─────────┘    │
│        │              │              │              │               │
│        │              │              │              │               │
│   Production     Production      Staging       Staging              │
│   Frontend       Backend         Frontend      Backend              │
│        │              │              │              │               │
│        ▼              ▼              ▼              ▼               │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐         │
│  │ Next.js │    │ FastAPI │    │ Next.js │    │ FastAPI │         │
│  │  PORT   │    │  PORT   │    │  PORT   │    │  PORT   │         │
│  │  3000   │    │  8001   │    │  3001   │    │  8002   │         │
│  │         │    │         │    │         │    │         │         │
│  │ BUILT   │    │ Uvicorn │    │  DEV    │    │ Uvicorn │         │
│  │ (prod)  │    │ --workers│   │ --reload│    │ --reload│         │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘         │
│       │              │              │              │                │
│       │              │              │              │                │
│     PM2          systemd          PM2          systemd             │
│  "frontend"     "backend"    "frontend-     "backend-              │
│                               staging"      staging"                │
│       │              │              │              │                │
│       └──────────────┴──────────────┴──────────────┘                │
│                          │                                          │
│                          ▼                                          │
│                   ┌─────────────┐                                   │
│                   │  Database   │                                   │
│                   │ bahamm1.db  │                                   │
│                   │  (SQLite)   │                                   │
│                   └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Domain → Service Mapping

### Production
- **app.bahamm.ir** → nginx → 127.0.0.1:3000 (Next.js built, PM2)
- **api.bahamm.ir** → nginx → 127.0.0.1:8001 (FastAPI, systemd)

### Staging
- **staging.bahamm.ir** → nginx → 127.0.0.1:3001 (Next.js dev mode, PM2)
- **staging-api.bahamm.ir** → nginx → 127.0.0.1:8002 (FastAPI --reload, systemd)

## File Structure on Server

```
/srv/bahamm/
├── backend/                    # Backend code (shared by both)
│   ├── venv/                  # Python virtual environment
│   ├── main.py                # FastAPI entry point
│   ├── app/                   # Application code
│   └── bahamm1.db            # Database (shared)
│
├── frontend/                   # Frontend code (shared by both)
│   ├── node_modules/
│   ├── src/                   # React/Next.js source
│   ├── package.json
│   ├── ecosystem.config.js    # PM2 config (both prod + staging)
│   └── .next/                 # Next.js build (production)
│
└── logs/                      # Log files
    ├── backend.log
    ├── backend_error.log
    ├── frontend-out.log
    ├── frontend-error.log
    ├── frontend-staging-out.log
    └── frontend-staging-error.log

/etc/systemd/system/
├── backend.service            # Production backend
└── backend-staging.service    # Staging backend (NEW)

/etc/nginx/sites-available/
├── bahamm                     # Production nginx config
└── staging-bahamm             # Staging nginx config (NEW)
```

## Process Management

### Backend Services (systemd)

| Service | Port | Mode | Auto-reload | Command |
|---------|------|------|------------|---------|
| `backend` | 8001 | Production | ❌ No | `uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2` |
| `backend-staging` | 8002 | Development | ✅ Yes | `uvicorn main:app --host 127.0.0.1 --port 8002 --reload` |

### Frontend Services (PM2)

| Service | Port | Mode | Auto-reload | Command |
|---------|------|------|------------|---------|
| `frontend` | 3000 | Production | ❌ No | `npm start` (runs built .next/) |
| `frontend-staging` | 3001 | Development | ✅ Yes | `npm run dev -- --port 3001` |

## Development Workflow

### Current (Before Staging)
```
┌──────────────┐
│ Change code  │
│   locally    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Deploy to    │
│  production  │
└──────┬───────┘
       │
       ▼
┌──────────────┐      NO ──┐
│ Does it work?│           │
└──────┬───────┘           │
       │ YES               │
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│   Success!   │    │ Rollback /   │
│              │    │ Debug / Fix  │
└──────────────┘    └──────┬───────┘
                           │
                           └─────► Repeat (30-60 min per cycle)
```

**Problems:**
- ❌ Long feedback loops (30-60 minutes)
- ❌ Production breaks affect real users
- ❌ Constant restarts waste time
- ❌ Risky deployments

### New (With Staging)
```
┌──────────────┐
│ Edit files   │
│ via Remote   │
│     SSH      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Changes     │
│ auto-apply   │
│ in STAGING   │
│  (~2 sec)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐      NO ──┐
│Test staging? │           │
│ Everything   │           │
│   working?   │           │
└──────┬───────┘           │
       │ YES               │
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │  Fix & test  │
       │            │  again in    │
       │            │   staging    │
       │            └──────┬───────┘
       │                   │
       │                   └─────► Quick iteration
       │
       ▼
┌──────────────┐
│ Deploy to    │
│  production  │
│ (confident!) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Success!   │
│  No surprises│
└──────────────┘
```

**Benefits:**
- ✅ Instant feedback (2 seconds)
- ✅ Safe testing (staging isolated)
- ✅ No restarts needed during dev
- ✅ Confident deployments

## Key Features

### Staging Environment

#### Backend Staging
- **Auto-reload**: Edit `.py` files → auto-restart in ~2 seconds
- **Separate port**: 8002 (production uses 8001)
- **Dev mode**: `--reload` flag enabled
- **Independent**: Can crash without affecting production

#### Frontend Staging
- **Hot Module Replacement (HMR)**: Edit React files → instant browser update
- **Separate port**: 3001 (production uses 3000)
- **Dev mode**: `next dev` with full error messages
- **Independent**: Separate PM2 process

### Production Environment
- **Unchanged**: All existing production services remain as-is
- **Stable**: Optimized builds, no reload overhead
- **Reliable**: Production users never see staging issues

## How They Share Resources

### Shared
- ✅ Same codebase (`/srv/bahamm/backend` and `/srv/bahamm/frontend`)
- ✅ Same database (both read/write to `bahamm1.db`)
- ✅ Same server infrastructure

### Isolated
- ✅ Different ports (no conflicts)
- ✅ Different process management
- ✅ Different nginx domains
- ✅ Different log files
- ✅ Production can't crash staging, staging can't crash production

## Typical Day Using Staging

```
08:00  Connect to server via VS Code Remote SSH
       Open /srv/bahamm/

08:05  Edit backend/app/routes/user_routes.py
       ↳ Save file
       ↳ Backend staging auto-restarts (2 sec)
       ↳ Test at https://staging-api.bahamm.ir/docs

08:10  Edit frontend/src/components/UserProfile.tsx
       ↳ Save file
       ↳ Browser auto-refreshes
       ↳ Test at https://staging.bahamm.ir

08:30  Bug found, fix it
       ↳ Save
       ↳ Instantly see the fix

09:00  Everything working in staging!
       ↳ Run: ./promote-staging-to-production.sh
       ↳ Production updated safely

09:05  Production deployed, users happy!
       No crashes, no surprises
```

## Resource Usage

### Memory Impact
- **Production Frontend**: ~150-300 MB
- **Staging Frontend**: ~150-300 MB (similar, dev mode)
- **Production Backend**: ~100-200 MB
- **Staging Backend**: ~100-200 MB
- **Total Additional**: ~400-600 MB for staging

### CPU Impact
- Minimal when idle
- Staging uses more CPU during hot-reload events
- Won't affect production performance

### Disk Space
- Both use same code (no duplication)
- Staging logs: minimal overhead
- `.next/` build cache for staging: ~100-200 MB

### Recommendation
- Minimum VPS: 2 GB RAM, 2 CPU cores
- Comfortable VPS: 4 GB RAM, 2+ CPU cores

## Security Considerations

### Staging Access
- Staging is on public domains (staging.bahamm.ir)
- Consider adding basic auth if needed:
```nginx
location / {
    auth_basic "Staging Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://127.0.0.1:3001;
}
```

### Database Separation
- Currently both use same DB (bahamm1.db)
- For complete isolation, consider:
  - Separate staging DB: `bahamm1-staging.db`
  - Update `backend-staging.service` environment variables

### SSL Certificates
- Staging uses Let's Encrypt (same as production)
- Free and automatic
- No additional cost

## Scaling Considerations

### If Staging Gets Busy
- Move staging to separate VPS
- Update nginx configs to proxy to remote IP
- Keep workflow identical

### If Need Multiple Staging Environments
- Create `backend-staging-2.service` on port 8003
- Create `frontend-staging-2` PM2 process on port 3002
- Add nginx configs for `staging2.bahamm.ir`, etc.

## Rollback Plan

If staging causes issues:

```bash
# Stop staging services
sudo systemctl stop backend-staging
pm2 stop frontend-staging

# Disable staging nginx
sudo rm /etc/nginx/sites-enabled/staging-bahamm
sudo systemctl reload nginx

# Production continues unaffected
```

To completely remove staging:
```bash
sudo systemctl disable backend-staging
sudo rm /etc/systemd/system/backend-staging.service
pm2 delete frontend-staging
pm2 save
```

## Summary

| Aspect | Production | Staging |
|--------|-----------|---------|
| Purpose | Serve real users | Test changes safely |
| Backend Port | 8001 | 8002 |
| Frontend Port | 3000 | 3001 |
| Backend Mode | Production (--workers 2) | Development (--reload) |
| Frontend Mode | Built (npm start) | Dev (npm run dev) |
| Domain | app.bahamm.ir | staging.bahamm.ir |
| API Domain | api.bahamm.ir | staging-api.bahamm.ir |
| Auto-reload | ❌ No | ✅ Yes |
| Process Manager | systemd + PM2 | systemd + PM2 |
| Shared Code | ✅ Yes | ✅ Yes |
| Shared Database | ✅ Yes | ✅ Yes |
| Independent | ✅ Isolated | ✅ Isolated |

---

**Questions?**
- Check README.md for detailed setup
- Check SETUP_CHECKLIST.md for step-by-step verification
- Check quick-commands.md for common operations


