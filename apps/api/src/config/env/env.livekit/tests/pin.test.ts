import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEnv, validOverlay } from '@/config/env/env';
import { livekitHostPinned } from '@/config/env/env.livekit/env.livekit';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };

afterEach(() => vi.unstubAllEnvs());

// Audit T1: the classroom server is wss only, and the DB may not move it off the env's host.
describe('LIVEKIT_URL', () => {
  it('boots with wss, or ws on localhost (dev, CI); plain ws to a public host fails the boot', () => {
    expect(loadEnv({ ...BASE, LIVEKIT_URL: 'wss://lk.example.test' }).LIVEKIT_URL).toBeDefined();
    expect(loadEnv({ ...BASE, LIVEKIT_URL: 'ws://localhost:7880' }).LIVEKIT_URL).toBeDefined();
    expect(() => loadEnv({ ...BASE, LIVEKIT_URL: 'ws://lk.example.test' })).toThrow();
    expect(() => loadEnv({ ...BASE, LIVEKIT_URL: 'https://lk.example.test' })).toThrow();
  });

  it('a DB value on the env host passes; another host is refused', () => {
    expect(livekitHostPinned('wss://lk.example.test/', 'wss://LK.example.test')).toBe(true);
    expect(livekitHostPinned('wss://evil.example.test', 'wss://lk.example.test')).toBe(false);
    expect(livekitHostPinned('wss://lk.example.test:8443', 'wss://lk.example.test')).toBe(false);
  });

  it('without an env value the DB value stands (wss still required by its schema)', () => {
    expect(livekitHostPinned('wss://lk.example.test', undefined)).toBe(true);
    expect(livekitHostPinned('wss://lk.example.test', '')).toBe(true);
  });

  it('the overlay drops a DB LIVEKIT_URL on another host and names the key', () => {
    vi.stubEnv('LIVEKIT_URL', 'wss://lk.example.test');
    const bad: string[] = [];
    const raw = { LIVEKIT_URL: 'wss://evil.example.test', WA_WABA_ID: 'w' };
    expect(validOverlay(raw, (key) => bad.push(key))).toEqual({ WA_WABA_ID: 'w' });
    expect(bad).toEqual(['LIVEKIT_URL']);
    expect(validOverlay({ LIVEKIT_URL: 'wss://lk.example.test/' }, () => undefined)).toEqual({
      LIVEKIT_URL: 'wss://lk.example.test/',
    });
  });
});
