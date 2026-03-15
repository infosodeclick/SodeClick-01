module.exports = {
  apps: [{
    name: 'sodeclick-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    wait_ready: true,
    // Health check
    health_check_grace_period: 3000,
    // Advanced options
    node_args: '--max-old-space-size=1024',
    exec_mode: 'fork',
    // Environment specific settings
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000,
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sodeclick'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/sodeclick.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
