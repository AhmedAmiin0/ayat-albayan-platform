import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../config/env/env';
import { SENDER_FIRST_RUN_MS, SENDER_POLL_MS, senderTiming } from './sender-timing';

const BASE = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };

describe('senderTiming: the outbound tick', () => {
  it('unset keeps the production cadence (30 s, first run 30 s after boot)', () => {
    expect(senderTiming(undefined)).toEqual({ firstMs: SENDER_FIRST_RUN_MS, everyMs: SENDER_POLL_MS });
    expect(SENDER_POLL_MS).toBe(30_000);
  });

  it('MESSAGE_SENDER_POLL_MS (e2e) sets both', () => {
    expect(senderTiming(1_000)).toEqual({ firstMs: 1_000, everyMs: 1_000 });
  });

  it('env: blank is unset, a number is read, below 200 ms is refused', () => {
    expect(loadEnv({ ...BASE, MESSAGE_SENDER_POLL_MS: '' }).MESSAGE_SENDER_POLL_MS).toBeUndefined();
    expect(loadEnv({ ...BASE, MESSAGE_SENDER_POLL_MS: '1000' }).MESSAGE_SENDER_POLL_MS).toBe(1_000);
    expect(() => loadEnv({ ...BASE, MESSAGE_SENDER_POLL_MS: '50' })).toThrow();
  });
});
