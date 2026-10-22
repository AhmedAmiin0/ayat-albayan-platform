import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../common/db/db.module';
import { GoogleItemsQueries } from './google-items.queries';
import { item } from './google-sync.fakes';

describe('GoogleItemsQueries.claim', () => {
  it('hands a pass its items events → PDF → attendance → summary, whatever order RETURNING gave', async () => {
    const rows = [item({ id: 's', kind: 'summary_row' }), item({ id: 'a', kind: 'attendance_row' }), item({ id: 'p', kind: 'report_pdf' }), item({ id: 'e', kind: 'main_event' })];
    const db = { rpc: vi.fn().mockResolvedValue({ data: rows, error: null }) };
    const claimed = await new GoogleItemsQueries(db as unknown as Db).claim(25);
    expect(claimed.map((r) => r.id)).toEqual(['e', 'p', 'a', 's']);
    expect(db.rpc).toHaveBeenCalledWith('google_sync_claim', expect.objectContaining({ p_limit: 25 }));
  });
});

describe('GoogleItemsQueries.requeueReportRows', () => {
  it('re-queues FAILED rows too (skip_reason null), only already_in_sheet stays', async () => {
    const calls: [string, unknown[]][] = [];
    const chain: Record<string, unknown> = {};
    for (const m of ['update', 'in', 'neq', 'or']) chain[m] = (...args: unknown[]) => (calls.push([m, args]), chain);
    chain['then'] = (ok: (v: { error: null }) => unknown) => ok({ error: null });
    const db = { from: vi.fn().mockReturnValue(chain) };
    await new GoogleItemsQueries(db as unknown as Db).requeueReportRows({ reportId: 'r1', studentId: 's1' });
    expect(calls.some(([m]) => m === 'neq')).toBe(false);
    expect(calls).toContainEqual(['or', ['skip_reason.is.null,skip_reason.neq.already_in_sheet']]);
    expect(calls).toContainEqual(['in', ['state', ['failed', 'skipped']]]);
  });
});

describe('GoogleItemsQueries.finish', () => {
  it('a lesson that changed while its event was found gone is re-queued WITHOUT the dead id (recreated, §2.4)', async () => {
    const updates: unknown[] = [];
    const chain: Record<string, unknown> = {};
    chain['update'] = (p: unknown) => (updates.push(p), chain);
    for (const m of ['eq', 'is']) chain[m] = () => chain;
    chain['select'] = () => Promise.resolve({ data: [{ dirty: true }], error: null });
    chain['then'] = (ok: (v: { error: null }) => unknown) => ok({ error: null });
    const db = { from: vi.fn().mockReturnValue(chain) };
    await new GoogleItemsQueries(db as unknown as Db).finish({ id: 'i', claim_token: 't' }, { state: 'gone', error: 'deleted_in_google' });
    expect(updates[1]).toMatchObject({ state: 'pending', google_id: null });
  });
});
