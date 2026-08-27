import { describe, expect, it } from 'vitest';
import { createApp } from '@/createApp';
import { BACKEND_PROXY_ROUTE_MANIFEST } from './fixtures/routeManifest';
import { collectExpressRoutes, hasRoute } from './helpers/collectExpressRoutes';

describe('backend-proxy route registration', () => {
  const routes = collectExpressRoutes(createApp());

  it.each(BACKEND_PROXY_ROUTE_MANIFEST)('$method $path is registered', ({ method, path }) => {
    expect(hasRoute(routes, method, path)).toBe(true);
  });
});
