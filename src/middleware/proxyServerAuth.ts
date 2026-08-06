import { db } from '@/db';
import { DCS_SERVER_HEADER } from '@/constants/dcsHeaders';
import { queryProxyServerByIdentifier } from '@/queries/proxy/proxyQueries';
import { captureException } from '@/observability/sentry';
import { getRequestPath, getRequestRoute } from '@/observability/runtimeLogger';
import type { NextFunction, Request, Response } from 'express';

export type ProxyServerContext = {
  id: number;
  identifier: string;
  active: boolean;
};

const decodeServerIdentifier = (headerValue: string | undefined) => {
  if (!headerValue || headerValue === '0') {
    return null;
  }

  try {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf8').trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
};

export const resolveProxyServer = async (req: Request): Promise<ProxyServerContext | null> => {
  const identifier = decodeServerIdentifier(req.header(DCS_SERVER_HEADER));
  if (!identifier) {
    return null;
  }

  const { rows } = await db.query(queryProxyServerByIdentifier, [identifier]);
  if (rows.length !== 1) {
    return null;
  }

  const row = rows[0] as { id: number; identifier: string; active: boolean };
  if (!row.active) {
    return null;
  }

  return {
    id: row.id,
    identifier: row.identifier,
    active: row.active,
  };
};

export const requireProxyServer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const server = await resolveProxyServer(req);
    if (!server) {
      return res.status(403).json([]);
    }

    req.proxyServer = server;
    return next();
  } catch (error) {
    captureException(error, {
      method: req.method,
      route: getRequestRoute(req),
      path: getRequestPath(req),
      statusCode: 403,
      component: 'auth',
      eventType: 'proxy_server_auth',
    });
    return res.status(403).json([]);
  }
};
