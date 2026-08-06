import type { NextFunction, Request, Response } from 'express';
import logger from '@/logger';

type HttpError = Error & {
  status?: number;
  statusCode?: number;
};

export const errorHandlerMiddleware = (
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const httpError = error as HttpError;
  const statusCode = typeof httpError.statusCode === 'number'
    ? httpError.statusCode
    : typeof httpError.status === 'number'
      ? httpError.status
      : 500;

  logger.error('HTTP exception', {
    statusCode,
    error: httpError instanceof Error ? httpError.message : String(error),
    stack: httpError instanceof Error ? httpError.stack : undefined,
  });

  response.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : httpError.message || 'Request failed',
  });
};
