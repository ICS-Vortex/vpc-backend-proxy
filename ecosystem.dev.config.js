const path = require('path');

const workspaceDir = process.env.WORKSPACE_DIR || __dirname;
const currentLink = process.env.CURRENT_LINK || path.join(workspaceDir, '.deploy/dev/current');
const currentScriptPath = path.join(currentLink, 'dist/index.js');

const env = {
  WORKSPACE_DIR: workspaceDir,
  BACKEND_PROXY_ENV_FILE: process.env.BACKEND_PROXY_ENV_FILE || path.join(currentLink, '.env'),
  BACKEND_ENV_FILE: process.env.BACKEND_ENV_FILE || path.join(workspaceDir, '../backend/.env'),
  LOGS_DIR: process.env.LOGS_DIR || path.join(workspaceDir, 'logs'),
  APP_PORT: process.env.APP_PORT || '4006',
  PROXY_PUBLIC_HOST: process.env.PROXY_PUBLIC_HOST || 'proxy.dev.virpil-servers.com',
  NODE_ENV: process.env.NODE_ENV || 'production',
};

module.exports = {
  apps: [
    {
      name: 'dcs-lua-api-dev',
      script: currentScriptPath,
      cwd: currentLink,
      interpreter: '/usr/bin/node',
      exec_mode: 'fork_mode',
      merge_logs: true,
      kill_timeout: 10000,
      restart_delay: 5000,
      autorestart: true,
      max_restarts: 10,
      env,
    },
  ],
};
