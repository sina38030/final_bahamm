module.exports = {
  apps: [
    // Production Backend
    {
      name: 'bahamm-backend',
      cwd: '/srv/app/frontend/backend',
      script: '/usr/bin/bash',
      args: '-c "source .venv/bin/activate && python3 -m uvicorn main:app --host 0.0.0.0 --port 8001"',
      env: {
        DATABASE_URL: 'sqlite:////srv/app/bahamm1.db',
        FRONTEND_URL: 'https://bahamm.ir'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/srv/app/logs/backend-error.log',
      out_file: '/srv/app/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};

