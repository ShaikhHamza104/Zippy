import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';

describe('Server Health and Diagnostic Endpoints', () => {
  it('GET /health returns 200 and liveness status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /ready returns 200 and readiness status', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ready');
    expect(res.body.checks).toHaveProperty('server', 'ok');
  });

  it('GET /api/v1 returns 200 and version info', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.message).toContain('Zippy REST API v1');
    expect(res.body).toHaveProperty('version', '1.0.0');
  });

  it('GET /unknown-route returns 404 JSON with fail status', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toContain('Cannot GET /unknown-route');
    expect(res.body).toHaveProperty('requestId');
  });
});
