import { describe, expect, it } from 'vitest';
import { firstOrigin } from '@/common/http/public-origin';
import { loadEnv } from '@/config/env/env';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };

describe('env: WEB_ORIGIN, a list with the staff app first (docs/51 §4)', () => {
  it('takes the full list, spaces and a trailing slash included', () => {
    const list = 'https://app.example.test/, https://family.example.test';
    expect(loadEnv({ ...BASE, WEB_ORIGIN: list }).WEB_ORIGIN).toBe(list);
    expect(firstOrigin(list)).toBe('https://app.example.test');
  });

  it('refuses a list whose first entry is not an http(s) origin (a leading comma)', () => {
    expect(() => loadEnv({ ...BASE, WEB_ORIGIN: ',https://family.example.test' })).toThrow();
    expect(() => loadEnv({ ...BASE, WEB_ORIGIN: 'app.example.test' })).toThrow();
    expect(() => loadEnv({ ...BASE, WEB_ORIGIN: 'https://app.example.test/set-password' })).toThrow();
  });

  it('defaults to the local staff app; empty stays allowed (no links)', () => {
    expect(loadEnv(BASE).WEB_ORIGIN).toBe('http://localhost:5173');
    expect(loadEnv({ ...BASE, WEB_ORIGIN: '' }).WEB_ORIGIN).toBe('');
  });
});
