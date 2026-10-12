import { INTEGRATION_KEYS } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { importEnv, type ImportStore } from './import-env';

function store(existing: string[] = []) {
  return {
    existing: vi.fn(async () => new Set(existing)),
    setPlain: vi.fn(async () => undefined),
    setSecret: vi.fn(async () => undefined),
  } satisfies ImportStore;
}

describe('config:import-env', () => {
  it('imports non-empty env values (plain → table, secret → Vault) and prints key names only', async () => {
    const s = store();
    const env = { WA_WABA_ID: ' w1 ', WA_ACCESS_TOKEN: 'SENTINEL-token', WA_APP_ID: '', SUPABASE_SERVICE_ROLE_KEY: 'SENTINEL-srk' };
    const lines = await importEnv({ env, store: s, overwrite: false });
    expect(lines).toHaveLength(INTEGRATION_KEYS.length);
    expect(lines).toContain('WA_WABA_ID: imported');
    expect(lines).toContain('WA_ACCESS_TOKEN: imported');
    expect(lines).toContain('WA_APP_ID: skipped (not set in env)');
    expect(lines.join('\n')).not.toContain('SENTINEL');
    expect(lines.join('\n')).not.toContain('SUPABASE');
    expect(s.setPlain).toHaveBeenCalledWith('WA_WABA_ID', 'w1');
    expect(s.setSecret).toHaveBeenCalledWith('WA_ACCESS_TOKEN', 'SENTINEL-token');
    expect(s.setPlain).toHaveBeenCalledTimes(1);
  });

  it('keeps a DB value unless --overwrite; skips an invalid plain value', async () => {
    const env = { WA_WABA_ID: 'w1', WA_API_BASE: 'not a url' };
    const kept = store(['WA_WABA_ID']);
    const lines = await importEnv({ env, store: kept, overwrite: false });
    expect(lines).toContain('WA_WABA_ID: skipped (already in the database)');
    expect(lines).toContain('WA_API_BASE: skipped (invalid value)');
    expect(kept.setPlain).not.toHaveBeenCalled();
    const over = store(['WA_WABA_ID']);
    expect(await importEnv({ env, store: over, overwrite: true })).toContain('WA_WABA_ID: imported');
  });
});
