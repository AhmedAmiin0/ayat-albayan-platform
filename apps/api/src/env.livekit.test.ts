import { describe, expect, it } from 'vitest';
import { livekitEnv, loadEnv } from './env';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const LK = { LIVEKIT_URL: 'wss://livekit.example.test', LIVEKIT_API_KEY: 'key', LIVEKIT_API_SECRET: 'secret' };

describe('env: LiveKit (optional, all three or none)', () => {
  it('boots without any LIVEKIT_* value; the classroom is then off', () => {
    expect(livekitEnv(loadEnv(BASE))).toBeNull();
    expect(livekitEnv(loadEnv({ ...BASE, LIVEKIT_URL: '', LIVEKIT_API_KEY: '', LIVEKIT_API_SECRET: '' }))).toBeNull();
  });

  it('is configured only when url, key and secret are all there', () => {
    expect(livekitEnv(loadEnv({ ...BASE, ...LK }))).toEqual({ url: LK.LIVEKIT_URL, apiKey: 'key', apiSecret: 'secret' });
    expect(livekitEnv(loadEnv({ ...BASE, ...LK, LIVEKIT_API_SECRET: '' }))).toBeNull();
    expect(livekitEnv(loadEnv({ ...BASE, LIVEKIT_API_KEY: 'key' }))).toBeNull();
  });

  it('a malformed LIVEKIT_URL fails the boot', () => {
    expect(() => loadEnv({ ...BASE, ...LK, LIVEKIT_URL: 'not a url' })).toThrow();
  });
});
