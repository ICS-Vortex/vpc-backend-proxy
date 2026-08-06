import type { NextFunction, Request, Response } from 'express';
import { captureException } from '@/observability/sentry';
import { getRequestPath, getRequestRoute, logHttpException } from '@/observability/runtimeLogger';

type HttpError = Error & {
  status?: number;
  statusCode?: number;
};

export const errorHandlerMiddleware = (
  error: unknown,
  request: Request,
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

  logHttpException(request, error, statusCode);

  if (statusCode >= 500) {
    captureException(error, {
      method: request.method,
      route: getRequestRoute(request),
      path: getRequestPath(request),
      statusCode,
      component: 'http',
      eventType: 'http_exception',
    });
  }

  response.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : httpError.message || 'Request failed',
  });
};
