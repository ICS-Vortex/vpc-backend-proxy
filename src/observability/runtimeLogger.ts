import type { Request } from 'express';
import logger from '@/logger';
import { captureException } from '@/observability/sentry';

export const getRequestPath = (request: Request): string => {
  return request.originalUrl.split('?')[0] || request.path || '/';
};

export const getRequestRoute = (request: Request): string => {
  const routePath = request.route?.path;

  if (typeof routePath === 'string') {
    return `${request.baseUrl}${routePath}` || '/';
  }

  if (Array.isArray(routePath)) {
    return `${request.baseUrl}${routePath.join('|')}` || '/';
  }

  return getRequestPath(request);
};

export const normalizeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    const normalizedError: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    const errorWithCode = error as Error & { code?: unknown; status?: unknown; statusCode?: unknown };

    if (errorWithCode.code !== undefined) {
      normalizedError.code = errorWithCode.code;
    }

    if (errorWithCode.status !== undefined) {
      normalizedError.status = errorWithCode.status;
    }

    if (errorWithCode.statusCode !== undefined) {
      normalizedError.statusCode = errorWithCode.statusCode;
    }

    return normalizedError;
  }

  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
    raw: error,
  };
};

export const logHttpException = (request: Request, error: unknown, statusCode: number): void => {
  logger.error('HTTP exception', {
    logType: 'runtime',
    eventType: 'http_exception',
    component: 'http',
    method: request.method,
    route: getRequestRoute(request),
    path: getRequestPath(request),
    statusCode,
    error: normalizeError(error),
  });
};

export const logUnhandledRejection = (reason: unknown): void => {
  logger.error('Unhandled promise rejection', {
    logType: 'runtime',
    eventType: 'unhandled_rejection',
    component: 'process',
    error: normalizeError(reason),
  });

  captureException(reason, {
    component: 'process',
    eventType: 'unhandled_rejection',
  });
};

export const logUncaughtException = (error: unknown): void => {
  logger.error('Uncaught exception', {
    logType: 'runtime',
    eventType: 'uncaught_exception',
    component: 'process',
    error: normalizeError(error),
  });

  captureException(error, {
    component: 'process',
    eventType: 'uncaught_exception',
  });
};
