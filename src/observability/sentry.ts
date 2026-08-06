import * as Sentry from '@sentry/node';
import { config } from '@/config';

let initialized = false;

export const isSentryEnabled = (): boolean => {
  return Boolean(config.sentry.dsn);
};

const scrubRequestHeaders = (event: Sentry.ErrorEvent): Sentry.ErrorEvent => {
  if (!event.request?.headers) {
    return event;
  }

  const headers = { ...event.request.headers };
  delete headers.authorization;
  delete headers.Authorization;
  delete headers.cookie;
  delete headers.Cookie;
  delete headers['x-dcs-server'];
  delete headers['X-DCS-SERVER'];
  delete headers['x-dcs-ucid'];
  delete headers['X-DCS-UCID'];

  return {
    ...event,
    request: {
      ...event.request,
      headers,
    },
  };
};

export const initSentry = (): void => {
  if (initialized || !config.sentry.dsn) {
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    release: config.sentry.release || undefined,
    tracesSampleRate: config.sentry.tracesSampleRate,
    beforeSend(event) {
      return scrubRequestHeaders(event);
    },
    initialScope(scope) {
      scope.setTag('service', 'backend-proxy');
      scope.setTag('runtime', 'nodejs');
      scope.setTag('platform', 'vpc');
      return scope;
    },
  });

  initialized = true;
};

export type SentryCaptureContext = {
  route?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  component?: string;
  eventType?: string;
};

export const captureException = (error: unknown, context?: SentryCaptureContext): void => {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.route) {
      scope.setTag('route', context.route);
    }

    if (context?.path) {
      scope.setTag('path', context.path);
    }

    if (context?.method) {
      scope.setTag('method', context.method);
    }

    if (context?.statusCode !== undefined) {
      scope.setTag('statusCode', String(context.statusCode));
    }

    if (context?.component) {
      scope.setTag('component', context.component);
    }

    if (context?.eventType) {
      scope.setTag('eventType', context.eventType);
    }

    Sentry.captureException(error);
  });
};
