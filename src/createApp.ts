import express, { json, type Express } from 'express';
import helmet from 'helmet';
import proxyRouter from '@/routers/index';
import { errorHandlerMiddleware } from '@/middleware/errorHandler';

export const createApp = (): Express => {
  const app = express();

  app.use(helmet());
  app.use(json({ limit: '1mb' }));
  app.use(proxyRouter);
  app.use(errorHandlerMiddleware);

  return app;
};
