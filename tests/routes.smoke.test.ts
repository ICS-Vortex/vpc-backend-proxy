import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '@/createApp';
import { BACKEND_PROXY_SMOKE_ROUTES } from './fixtures/routeManifest';
import { expectRouteRegistered } from './helpers/routeAssertions';
import { proxyAuthHeader } from './setup';

describe('backend-proxy route smoke', () => {
  const app = createApp();

  it.each(BACKEND_PROXY_SMOKE_ROUTES)('$method $path responds without 404', async ({ method, path, auth }) => {
    const agent = request(app)[method.toLowerCase() as 'get' | 'post'](path);
    const response = auth ? await agent.set(proxyAuthHeader()) : await agent;

    expectRouteRegistered(response);
  });

  it('rejects protected routes without DCS server header', async () => {
    const response = await request(app).get('/activities/current');

    expect(response.status).toBe(403);
    expect(response.body).toEqual([]);
  });

  it('GET /activities/current returns JSON array when authorized', async () => {
    const response = await request(app).get('/activities/current').set(proxyAuthHeader());

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
