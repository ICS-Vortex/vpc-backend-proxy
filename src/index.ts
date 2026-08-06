import logger from '@/logger';
import express, { json } from 'express';
import http from 'http';
import { config } from '@/config';
import proxyRouter from '@/routers/index';
import { errorHandlerMiddleware } from '@/middleware/errorHandler';

const app = express();

app.use(json({ limit: '1mb' }));
app.use(proxyRouter);
app.use(errorHandlerMiddleware);

const server = http.createServer(app);

server.listen(config.server.port, () => {
  logger.info(`DCS proxy API listening on http://0.0.0.0:${config.server.port} (public: http://${config.server.publicHost})`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
