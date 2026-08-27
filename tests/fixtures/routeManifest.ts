export type RouteExpectation = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  path: string;
  auth?: boolean;
};

export const BACKEND_PROXY_ROUTE_MANIFEST: RouteExpectation[] = [
  { method: 'GET', path: '/' },
  { method: 'HEAD', path: '/' },
  { method: 'POST', path: '/ping' },
  { method: 'GET', path: '/activities/schedule', auth: true },
  { method: 'GET', path: '/activities/current', auth: true },
  { method: 'GET', path: '/activities/:activity/allocations', auth: true },
  { method: 'GET', path: '/pilots/banlist', auth: true },
  { method: 'GET', path: '/pilots/current', auth: true },
  { method: 'GET', path: '/pilots/:activity/allocations', auth: true },
  { method: 'GET', path: '/rights/list', auth: true },
  { method: 'GET', path: '/races/list', auth: true },
  { method: 'GET', path: '/tracks/list', auth: true },
  { method: 'GET', path: '/tracks/configs', auth: true },
  { method: 'GET', path: '/series/list', auth: true },
  { method: 'GET', path: '/series/:series/rounds', auth: true },
  { method: 'GET', path: '/series/rounds/:round/standings', auth: true },
  { method: 'GET', path: '/series/rounds/:round/pilots/:pilot/results', auth: true },
];

export const BACKEND_PROXY_SMOKE_ROUTES: RouteExpectation[] = [
  { method: 'GET', path: '/' },
  { method: 'POST', path: '/ping' },
  { method: 'GET', path: '/activities/current', auth: true },
  { method: 'GET', path: '/pilots/current', auth: true },
  { method: 'GET', path: '/races/list', auth: true },
];
