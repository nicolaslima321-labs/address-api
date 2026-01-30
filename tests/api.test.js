import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API Endpoints', () => {
  describe('GET /health', () => {
    test('returns health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('address-validation-api');
    });
  });

  describe('POST /validate-address', () => {
    test('validates a complete address', async () => {
      const response = await request(app)
        .post('/validate-address')
        .send({ address: '1600 Pennsylvania Avenue NW, Washington, DC 20500' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('address');
      expect(['valid', 'corrected', 'unverifiable']).toContain(response.body.status);
    }, 10000);

    test('returns error for missing address', async () => {
      const response = await request(app)
        .post('/validate-address')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.errors).toBeDefined();
    });

    test('returns error for empty address', async () => {
      const response = await request(app)
        .post('/validate-address')
        .send({ address: '' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    test('returns error for address too short', async () => {
      const response = await request(app)
        .post('/validate-address')
        .send({ address: 'abc' });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain('at least 5 characters');
    });

    test('handles partial address gracefully', async () => {
      const response = await request(app)
        .post('/validate-address')
        .send({ address: 'Main Street, New York' });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('status');
    }, 10000);

    test('returns structured address components', async () => {
      const response = await request(app)
        .post('/validate-address')
        .send({ address: '350 Fifth Avenue, New York, NY 10118' });

      expect(response.status).toBe(200);
      if (response.body.address) {
        expect(response.body.address).toHaveProperty('streetNumber');
        expect(response.body.address).toHaveProperty('street');
        expect(response.body.address).toHaveProperty('city');
        expect(response.body.address).toHaveProperty('state');
        expect(response.body.address).toHaveProperty('zipCode');
      }
    }, 10000);
  });

  describe('Error Handling', () => {
    test('returns 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    test('handles invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/validate-address')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });
});
