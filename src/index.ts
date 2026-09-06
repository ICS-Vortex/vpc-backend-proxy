import { initSentry } from '@/observability/sentry';

initSentry();

import logger from '@/logger';
import http from 'http';
import { config } from '@/config';
import { createApp } from '@/createApp';
import { logUnhandledRejection, logUncaughtException } from '@/observability/runtimeLogger';
import { registerGracefulShutdown } from '@/observability/gracefulShutdown';

const app = createApp();
const server = http.createServer(app);

server.listen(config.server.port, () => {
  logger.info(
    `DCS LUA HTTP API on http://0.0.0.0:${config.server.port} (public vhost: http://${config.server.publicHost})`,
  );
});

registerGracefulShutdown({ server, logger });

process.on('unhandledRejection', (reason) => {
  logUnhandledRejection(reason);
});

process.on('uncaughtException', (error) => {
  logUncaughtException(error);
  process.exit(1);
});
