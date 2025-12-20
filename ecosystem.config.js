module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/home/ubuntu/bahamm-git/backend',
      script: 'venv/bin/python3',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8001 --reload',
      interpreter: 'none',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        PYTHONUNBUFFERED: '1',
        FRONTEND_URL: 'https://bahamm.ir',
      }
    },
    {
      name: 'frontend',
      cwd: '/home/ubuntu/bahamm-git/frontend',
      script: 'npm',
      args: 'run dev',
      interpreter: 'none',
      watch: false,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: '3000'
      }
    }
  ]
};
