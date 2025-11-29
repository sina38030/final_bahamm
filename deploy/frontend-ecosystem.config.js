module.exports = {
  apps: [
    // Production Frontend
    {
      name: 'frontend',
      cwd: '/srv/app/frontend/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://api.bahamm.ir',
        NEXT_PUBLIC_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/srv/app/logs/frontend-error.log',
      out_file: '/srv/app/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};

