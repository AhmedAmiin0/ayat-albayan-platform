import { describe, expect, it } from 'vitest';
import { evolutionRoutes as routes } from '..';

const ID = '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20';
const AT = '2026-11-27T10:00:00.000Z';
const SYNC = {
  synced: true,
  checked_at: AT,
  parts: { instance: 'synced', settings: 'synced', webhook: 'synced', proxy: 'synced' },
};

describe('evolutionRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /admin/numbers/:id/evolution/state',
      'GET /admin/numbers/:id/evolution/qr',
      'PUT /admin/numbers/:id/evolution/config',
      'POST /admin/numbers/:id/evolution/sync',
      'GET /admin/numbers/:id/evolution/sync',
    ]);
  });

  it('lets every route in with numbers.manage only, all tagged numbers', () => {
    const all = Object.values(routes);
    expect(new Set(all.flatMap((r) => r.permissions))).toEqual(new Set(['numbers.manage']));
    expect(new Set(all.flatMap((r) => r.tags))).toEqual(new Set(['numbers']));
  });

  it('takes a uuid id on every route', () => {
    const bad = Object.values(routes).filter((r) => r.params.safeParse({ id: 'x' }).success);
    expect(bad).toEqual([]);
    expect(routes.qr.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('answers a state, unknown as null, and refuses a word it does not know', () => {
    const unknown = { state: null, checked_at: AT };
    expect(routes.state.response.parse(unknown)).toEqual(unknown);
    expect(routes.state.response.safeParse({ state: 'gone', checked_at: AT }).success).toBe(false);
  });

  it('answers a qr while waiting and none once connected', () => {
    const waiting = { state: 'connecting', qr: 'data:image/png;base64,AA==', pairing_code: 'K1' };
    const open = { state: 'open', qr: null, pairing_code: null };
    expect([waiting, open].map((v) => routes.qr.response.parse(v))).toEqual([waiting, open]);
    expect(routes.qr.response.safeParse({ state: 'open' }).success).toBe(false);
  });

  it('saves a config with its defaults and answers each sync route with the sync view', () => {
    expect(routes.saveConfig.body.parse({}).limits.daily_cap).toBe(60);
    expect(routes.saveConfig.body.safeParse({ limits: { gap_ms: -1 } }).success).toBe(false);
    const answers = [routes.saveConfig, routes.push, routes.verify].map((r) => r.response);
    expect(answers.map((s) => s.parse(SYNC))).toEqual([SYNC, SYNC, SYNC]);
  });
});
