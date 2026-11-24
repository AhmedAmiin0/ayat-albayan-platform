import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env/env';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };

describe('DB_TIMEOUT_MS (the deadline of one database call)', () => {
  it('unset or blank: 15 s, today’s behaviour bar the hang', () => {
    expect(loadEnv(BASE).DB_TIMEOUT_MS).toBe(15_000);
    expect(loadEnv({ ...BASE, DB_TIMEOUT_MS: ' ' }).DB_TIMEOUT_MS).toBe(15_000);
  });

  it('a number of ms between 1 s and 2 min', () => {
    expect(loadEnv({ ...BASE, DB_TIMEOUT_MS: '5000' }).DB_TIMEOUT_MS).toBe(5_000);
  });

  it.each(['10', '999999', 'soon', '1.5'])('%s stops the boot', (v) => {
    expect(() => loadEnv({ ...BASE, DB_TIMEOUT_MS: v })).toThrow();
  });
});
