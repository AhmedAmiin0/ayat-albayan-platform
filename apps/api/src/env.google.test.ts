import { describe, expect, it } from 'vitest';
import { loadEnv, validOverlay } from './env';
import { googleEndpoints, googleEnv, googleRedirectUri } from './env.google';

const BASE = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'service' };
const CLIENT = { GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'fake-secret' };

describe('Google env (docs/24)', () => {
  it('is null until both the client id and secret are set', () => {
    expect(googleEnv(loadEnv(BASE))).toBeNull();
    expect(googleEnv(loadEnv({ ...BASE, GOOGLE_CLIENT_ID: CLIENT.GOOGLE_CLIENT_ID }))).toBeNull();
    expect(googleEnv(loadEnv({ ...BASE, ...CLIENT }))).toMatchObject({ clientId: CLIENT.GOOGLE_CLIENT_ID, clientSecret: 'fake-secret' });
  });

  it('uses the production callback unless this environment sets its own', () => {
    expect(googleRedirectUri(loadEnv(BASE))).toBe('https://api.ayatalbayan.com/integrations/google/callback');
    const e2e = loadEnv({ ...BASE, GOOGLE_REDIRECT_URI: 'http://localhost:3100/integrations/google/callback' });
    expect(googleRedirectUri(e2e)).toBe('http://localhost:3100/integrations/google/callback');
  });

  it('points every endpoint at the stub when GOOGLE_API_BASE is set', () => {
    const stub = googleEndpoints('http://localhost:4120/');
    expect(Object.values(stub).every((u) => u.startsWith('http://localhost:4120'))).toBe(true);
    expect(stub.token).toBe('http://localhost:4120/token');
    expect(googleEndpoints(undefined).token).toBe('https://oauth2.googleapis.com/token');
  });

  it('lets the database overlay set the client id and secret, never the base or the callback', () => {
    const raw = { ...CLIENT, GOOGLE_API_BASE: 'http://evil.test', GOOGLE_REDIRECT_URI: 'http://evil.test/cb' };
    expect(Object.keys(validOverlay(raw, () => undefined)).sort()).toEqual(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']);
  });
});
