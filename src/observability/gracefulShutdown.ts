import type { Server } from 'http';

type ShutdownLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

type GracefulShutdownOptions = {
  server: Server;
  logger: ShutdownLogger;
  timeoutMs?: number;
};

export const registerGracefulShutdown = ({
  server,
  logger,
  timeoutMs = 10_000,
}: GracefulShutdownOptions) => {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down HTTP server`);

    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, timeoutMs);
    forceExitTimer.unref();

    server.close((error) => {
      clearTimeout(forceExitTimer);

      if (error) {
        logger.error('Error while closing HTTP server', { error });
        process.exit(1);
      }

      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};
