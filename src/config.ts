import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const env = process.env;

const resolveExistingPath = (...candidates: Array<string | undefined>) => {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const resolvedCandidate = path.resolve(candidate);
    if (fs.existsSync(resolvedCandidate)) {
      return resolvedCandidate;
    }
  }

  return path.resolve(candidates.find(Boolean) || '.');
};

const workspaceDir = path.resolve(env.WORKSPACE_DIR || process.cwd());

dotenv.config({
  path: resolveExistingPath(
    env.BACKEND_PROXY_ENV_FILE,
    path.resolve(process.cwd(), '.env'),
    path.resolve(workspaceDir, '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
  ),
});

dotenv.config({
  path: resolveExistingPath(
    env.BACKEND_ENV_FILE,
    path.resolve(workspaceDir, '../backend/.env'),
    path.resolve(process.cwd(), '../backend/.env'),
    path.resolve(__dirname, '../../backend/.env'),
  ),
});

export const config = {
  node_env: env.NODE_ENV || 'dev',
  logs: {
    dir: env.LOGS_DIR || path.resolve(workspaceDir, 'logs'),
    level: env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug'),
    maxSize: env.LOG_MAX_SIZE || '20m',
    maxFiles: env.LOG_MAX_FILES || '14d',
  },
  db: {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    database: env.DB_NAME || 'virpil_servers_db',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '62103128',
  },
  server: {
    port: Number(env.APP_PORT || 4006),
    publicHost: env.PROXY_PUBLIC_HOST?.trim() || 'proxy.vpc.local',
  },
};
