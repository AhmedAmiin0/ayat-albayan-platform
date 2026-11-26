import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CrmPageQuery, CrmReader } from './crm.ts';
import { CRM_TABLES } from './crm.schema.ts';
import { extractCrm } from './extract-crm.ts';

const files = vi.hoisted(() => new Map<string, unknown>());

vi.mock('../cache.ts', () => ({
  cachePath: { crm: (t: string) => `crm/${t}`, crmCursor: () => 'crm/cursor' },
  readJson: (path: string, fallback: unknown) => (files.has(path) ? files.get(path) : fallback),
  writeJson: (path: string, value: unknown) => files.set(path, value),
}));

const [FIRST] = CRM_TABLES;
const TABLE = FIRST?.table ?? '';
const CURSOR = FIRST?.cursor ?? '';

function reader(rows: Record<string, unknown>[]) {
  const asked: CrmPageQuery[] = [];
  const r: CrmReader = {
    selectPage: (q) => {
      asked.push(q);
      return Promise.resolve(q.spec.table === TABLE && q.page === 0 ? rows : []);
    },
  };
  return { r, asked };
}

beforeEach(() => files.clear());

describe('extractCrm', () => {
  it('fails without an account id', async () => {
    vi.stubEnv('CRM_ACCOUNT_ID', '');
    await expect(extractCrm({ reader: reader([]).r })).rejects.toThrow('CRM_ACCOUNT_ID missing');
    vi.unstubAllEnvs();
  });

  it('takes the account id from the env when none is passed', async () => {
    vi.stubEnv('CRM_ACCOUNT_ID', 'acc-env');
    const { r, asked } = reader([]);
    await extractCrm({ reader: r });
    expect(asked.every((q) => q.accountId === 'acc-env')).toBe(true);
    vi.unstubAllEnvs();
  });

  it('re-reads everything without --since and keeps no cached rows', async () => {
    files.set(`crm/${TABLE}`, [{ id: 'old' }]);
    const { r, asked } = reader([{ id: 'a', [CURSOR]: '2026-10-02' }]);
    const counts = await extractCrm({ reader: r, accountId: 'acc' });
    expect(counts[TABLE]).toBe(1);
    expect(asked.every((q) => q.since === undefined)).toBe(true);
    expect(files.get(`crm/${TABLE}`)).toEqual([{ id: 'a', [CURSOR]: '2026-10-02' }]);
    expect(files.get('crm/cursor')).toEqual({ [TABLE]: '2026-10-02' });
  });

  it('with --since last resumes per table and merges into the cache', async () => {
    files.set('crm/cursor', { [TABLE]: '2026-10-01' });
    files.set(`crm/${TABLE}`, [{ id: 'old', [CURSOR]: '2026-09-01' }]);
    const { r, asked } = reader([{ id: 'a', [CURSOR]: '2026-10-03' }]);
    const counts = await extractCrm({ reader: r, accountId: 'acc', since: 'last' });
    expect(asked.find((q) => q.spec.table === TABLE)?.since).toBe('2026-10-01');
    expect(asked.filter((q) => q.spec.table !== TABLE).every((q) => !q.since)).toBe(true);
    expect(counts[TABLE]).toBe(2);
    expect(files.get('crm/cursor')).toEqual({ [TABLE]: '2026-10-03' });
  });

  it('with an explicit --since reads every table from it', async () => {
    const { r, asked } = reader([]);
    await extractCrm({ reader: r, accountId: 'acc', since: '2026-10-05' });
    expect(asked.every((q) => q.since === '2026-10-05')).toBe(true);
    expect(files.get('crm/cursor')).toEqual({});
  });
});
