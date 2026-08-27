import type { Express } from 'express';

export type ExpressRoute = {
  method: string;
  path: string;
};

type Layer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
  name?: string;
  path?: string;
  handle?: { stack?: Layer[] };
  regexp?: RegExp & { fast_slash?: boolean };
};

const normalizePath = (prefix: string, fragment: string): string => {
  const combined = `${prefix}${fragment}`.replace(/\/+/g, '/');
  if (combined.length > 1 && combined.endsWith('/')) {
    return combined.slice(0, -1);
  }
  return combined || '/';
};

const mountPathFromLayer = (prefix: string, layer: Layer): string => {
  if (typeof layer.path === 'string') {
    if (layer.path === '/' || layer.path === '') {
      return normalizePath(prefix, '');
    }
    return normalizePath(prefix, layer.path);
  }

  if (!layer.regexp) {
    return prefix;
  }

  if (layer.regexp.fast_slash) {
    return normalizePath(prefix, '');
  }

  const source = layer.regexp.source
    .replace('^\\/', '/')
    .replace('\\/?(?=\\/|$)', '')
    .replace(/\\\//g, '/')
    .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param')
    .replace(/\(\?=\[\^\/\]\+\)/g, '')
    .replace(/\$$/, '');

  return normalizePath(prefix, source.startsWith('/') ? source : `/${source}`);
};

const walkStack = (stack: Layer[], prefix: string, routes: ExpressRoute[]): void => {
  for (const layer of stack) {
    if (layer.route) {
      const routePath = normalizePath(prefix, layer.route.path);
      for (const method of Object.keys(layer.route.methods)) {
        if (method === '_all') {
          continue;
        }
        routes.push({ method: method.toUpperCase(), path: routePath });
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      walkStack(layer.handle.stack, mountPathFromLayer(prefix, layer), routes);
    }
  }
};

export const collectExpressRoutes = (app: Express): ExpressRoute[] => {
  const routes: ExpressRoute[] = [];
  const appWithRouter = app as unknown as { router?: { stack?: Layer[] }; _router?: { stack?: Layer[] } };
  const stack = (appWithRouter.router?.stack ?? appWithRouter._router?.stack ?? []) as Layer[];
  walkStack(stack, '', routes);
  return routes;
};

export const hasRoute = (routes: ExpressRoute[], method: string, expectedPath: string): boolean => {
  const normalizedExpected = expectedPath.replace(/\/$/, '') || '/';

  return routes.some((route) => {
    if (route.method !== method) {
      return false;
    }

    const normalizedRoute = route.path.replace(/\/$/, '') || '/';
    return normalizedRoute === normalizedExpected;
  });
};
