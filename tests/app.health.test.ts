import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '@/createApp';

describe('backend-proxy health', () => {
  it('GET / returns OK', async () => {
    const app = createApp();
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('OK');
  });

  it('POST /ping returns ping payload', async () => {
    const app = createApp();
    const response = await request(app).post('/ping');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ping: true });
  });

  it('sets Helmet security headers', async () => {
    const app = createApp();
    const response = await request(app).get('/');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
