import express, { json, type Express } from 'express';
import proxyRouter from '@/routers/index';
import { errorHandlerMiddleware } from '@/middleware/errorHandler';

export const createApp = (): Express => {
  const app = express();

  app.use(json({ limit: '1mb' }));
  app.use(proxyRouter);
  app.use(errorHandlerMiddleware);

  return app;
};
