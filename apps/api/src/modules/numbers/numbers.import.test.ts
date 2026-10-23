import { afterEach, describe, expect, it, vi } from 'vitest';
import { setIntegrationOverlay } from '../../common/integrations/integration-overlay';
import type { NumbersConfig } from './numbers.config';
import { numberRow } from './numbers.fakes';
import { NumbersImport } from './numbers.import';
import type { NumbersQueries } from './numbers.queries';
import type { NumbersSecrets } from './numbers.secrets';

const ENV = { WA_API_BASE: 'http://localhost:4010', WA_PHONE_NUMBER_ID: '1000000001', WA_WABA_ID: '2000000001', WA_APP_SECRET: 'env-secret-fake' };

function setup() {
  const rows = [] as ReturnType<typeof numberRow>[];
  const set = new Map<string, Record<string, string>>();
  const queries = {
    all: vi.fn(async () => rows),
    hasDefault: vi.fn(async () => false),
    insert: vi.fn(async ({ row }: { row: object }) => {
      const r = numberRow({ ...row });
      rows.push(r);
      return r;
    }),
  };
  const mark = (id: string, name: string) => set.set(id, { ...set.get(id), [name]: '2026-10-23T08:00:00Z' });
  const secrets = {
    status: vi.fn(async () => new Map(set)),
    copy: vi.fn(async (t: { id: string; name: string }) => (mark(t.id, t.name), true)),
    set: vi.fn(async (t: { id: string; name: string }) => mark(t.id, t.name)),
  };
  const config = { refresh: vi.fn(async () => true) };
  const importer = new NumbersImport(queries as unknown as NumbersQueries, secrets as unknown as NumbersSecrets, config as unknown as NumbersConfig);
  return { importer, queries, secrets, config };
}

afterEach(() => {
  vi.unstubAllEnvs();
  setIntegrationOverlay({});
});

describe('POST /admin/numbers/import', () => {
  it('dry run writes nothing', async () => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    const t = setup();
    const res = await t.importer.run(true, 'actor');
    expect(res).toMatchObject({ dry_run: true, changed: true });
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.secrets.copy).not.toHaveBeenCalled();
    expect(t.secrets.set).not.toHaveBeenCalled();
  });

  it('apply: inserts the row (enabled, default) and copies DB secrets in the database, env secrets via set', async () => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    setIntegrationOverlay({ WA_ACCESS_TOKEN: 'db-token-fake' });
    const t = setup();
    const res = await t.importer.run(false, 'actor');
    expect(res.changed).toBe(true);
    expect(t.queries.insert).toHaveBeenCalledWith({
      row: expect.objectContaining({ label: 'رقم الإشعارات', purpose: 'notifications', phone_number_id: '1000000001', enabled: true, is_default: true, provider: 'meta' }),
      actorId: 'actor',
    });
    const id = res.roles[0]?.number_id;
    expect(t.secrets.copy).toHaveBeenCalledWith({ id, name: 'access_token' }, 'WA_ACCESS_TOKEN');
    expect(t.secrets.set).toHaveBeenCalledWith({ id, name: 'app_secret' }, 'env-secret-fake');
    expect(t.config.refresh).toHaveBeenCalledOnce();
    expect(JSON.stringify(res)).not.toMatch(/token-fake|secret-fake/);
  });

  it('a second apply is a no-op diff: nothing inserted or copied again', async () => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    setIntegrationOverlay({ WA_ACCESS_TOKEN: 'db-token-fake' });
    const t = setup();
    await t.importer.run(false, 'actor');
    vi.clearAllMocks();
    const again = await t.importer.run(false, 'actor');
    expect(again.changed).toBe(false);
    expect(again.roles[0]).toMatchObject({ action: 'exists', secrets_to_copy: [] });
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.secrets.copy).not.toHaveBeenCalled();
    expect(t.secrets.set).not.toHaveBeenCalled();
  });
});
