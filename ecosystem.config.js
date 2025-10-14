module.exports = {
  apps: [{
    name: 'bahamm-backend',
    cwd: '/srv/app/frontend/backend',
    script: '/usr/bin/bash',
    args: '-c "source .venv/bin/activate && python3 -m uvicorn main:app --host 0.0.0.0 --port 8001"',
    env: {
      DATABASE_URL: 'sqlite:////srv/app/bahamm1.db'
    }
  }]
};

