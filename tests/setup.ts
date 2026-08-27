import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_PORT = '0';
process.env.SENTRY_DSN = '';

const testServer = {
  id: 1,
  identifier: 'test-dcs-server',
  active: true,
};

vi.mock('@/db', () => ({
  db: {
    query: vi.fn().mockResolvedValue({
      rows: [testServer],
      rowCount: 1,
    }),
    connect: vi.fn(),
  },
}));

vi.mock('@/repositories/proxy/ProxyRepository', () => ({
  fetchProxyActivitySchedule: vi.fn().mockResolvedValue([]),
  fetchProxyCurrentActivities: vi.fn().mockResolvedValue([]),
  fetchProxyActivityAllocations: vi.fn().mockResolvedValue([]),
  fetchProxyPilotsBanlist: vi.fn().mockResolvedValue([]),
  fetchProxyPilotsCurrent: vi.fn().mockResolvedValue([]),
  fetchProxyPilotsAllocations: vi.fn().mockResolvedValue([]),
  fetchProxyRightsList: vi.fn().mockResolvedValue([]),
  fetchProxyRacesList: vi.fn().mockResolvedValue([]),
  fetchProxyRaceTracksList: vi.fn().mockResolvedValue([]),
  fetchProxyRaceTracksConfigs: vi.fn().mockResolvedValue([]),
  fetchProxySeriesList: vi.fn().mockResolvedValue([]),
  fetchProxySeriesRounds: vi.fn().mockResolvedValue([]),
  fetchProxySeriesRoundStandings: vi.fn().mockResolvedValue([]),
  fetchProxySeriesRoundPilotResults: vi.fn().mockResolvedValue([]),
}));

export const proxyAuthHeader = () => ({
  'x-dcs-server': Buffer.from(testServer.identifier, 'utf8').toString('base64'),
});
