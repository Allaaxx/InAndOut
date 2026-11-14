import { describe, it, expect } from 'vitest';
import { createApp } from '@server/main/app';

describe('Controller Seam: Auth & 4-Digit PIN Endpoints (app.inject)', () => {
  it('authenticates a teacher with valid email and password via POST /auth/login and rejects invalid credentials with 401', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const validRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'prof@linsdorego.edu.br',
        password: 'senha123',
      },
    });

    expect(validRes.statusCode).toBe(200);
    const validBody = validRes.json();
    expect(validBody.token).toEqual(expect.any(String));
    expect(validBody.refreshToken).toEqual(expect.any(String));
    expect(validBody.user).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      email: 'prof@linsdorego.edu.br',
      role: 'TEACHER',
    });

    const invalidRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'prof@linsdorego.edu.br',
        password: 'wrong-password',
      },
    });

    expect(invalidRes.statusCode).toBe(401);
    expect(invalidRes.json()).toMatchObject({
      error: expect.any(String),
    });

    await app.close();
  });

  it('verifies a valid 4-digit PIN via POST /auth/pin/verify and rejects an incorrect PIN with 401', async () => {
    const currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'prof@linsdorego.edu.br',
        password: 'senha123',
        pin: '4321',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const { token } = loginRes.json();

    const wrongPinRes = await app.inject({
      method: 'POST',
      url: '/auth/pin/verify',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        pin: '0000',
      },
    });
    expect(wrongPinRes.statusCode).toBe(401);
    expect(wrongPinRes.json()).toMatchObject({
      error: expect.stringMatching(/PIN/i),
    });

    const validPinRes = await app.inject({
      method: 'POST',
      url: '/auth/pin/verify',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        pin: '4321',
      },
    });
    expect(validPinRes.statusCode).toBe(200);
    const validPinBody = validPinRes.json();
    expect(validPinBody.valid).toBe(true);
    expect(validPinBody.unlockedToken).toEqual(expect.any(String));
    expect(validPinBody.user).toMatchObject({
      email: 'prof@linsdorego.edu.br',
      role: 'TEACHER',
    });

    await app.close();
  });

  it('rejects expired access tokens with 401 and renews session via POST /auth/refresh until refresh token expires', async () => {
    let currentTime = new Date('2026-03-10T08:00:00.000Z');
    const { app } = await createApp({ clock: () => currentTime });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'prof@linsdorego.edu.br',
        password: 'senha123',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const { token, refreshToken } = loginRes.json();

    // Advance clock by 2 hours (access token TTL is 1 hour)
    currentTime = new Date('2026-03-10T10:00:00.000Z');

    const expiredPinRes = await app.inject({
      method: 'POST',
      url: '/auth/pin/verify',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        pin: '1234',
      },
    });
    expect(expiredPinRes.statusCode).toBe(401);
    expect(expiredPinRes.json()).toMatchObject({
      error: expect.stringMatching(/expirad/i),
    });

    // Renew token via POST /auth/refresh using valid refreshToken (12h TTL)
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken,
      },
    });
    expect(refreshRes.statusCode).toBe(200);
    const refreshedBody = refreshRes.json();
    expect(refreshedBody.token).toEqual(expect.any(String));
    expect(refreshedBody.refreshToken).toEqual(expect.any(String));

    // Verify new token works on /auth/pin/verify
    const pinAfterRefreshRes = await app.inject({
      method: 'POST',
      url: '/auth/pin/verify',
      headers: {
        authorization: `Bearer ${refreshedBody.token}`,
      },
      payload: {
        pin: '1234',
      },
    });
    expect(pinAfterRefreshRes.statusCode).toBe(200);
    expect(pinAfterRefreshRes.json().valid).toBe(true);

    // Advance clock past refresh token TTL (24 hours later)
    currentTime = new Date('2026-03-11T12:00:00.000Z');

    const expiredRefreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken: refreshedBody.refreshToken,
      },
    });
    expect(expiredRefreshRes.statusCode).toBe(401);

    await app.close();
  });
});
