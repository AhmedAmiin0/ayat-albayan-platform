import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../common/db/db.module';
import { ReceivablesQueries } from './receivables.queries';

// «مستحق على الطلاب»: an unused-cancelled package (owner 2026-10-28) is never owed, like a trial
// one; a STOPPED one (owner 2026-10-30, migration 991) still is.

describe('receivables OWING', () => {
  it('the packages query reads every status that can owe and a stopped package, never trial or unused', async () => {
    const q = { select: vi.fn(), or: vi.fn(), gt: vi.fn(), order: vi.fn(), range: vi.fn() };
    for (const k of ['select', 'or', 'gt', 'order'] as const) q[k].mockReturnValue(q);
    q.range.mockResolvedValue({ data: [], error: null });
    const db = { from: vi.fn(() => q) } as unknown as Db;
    await new ReceivablesQueries(db).packages();
    expect(q.or).toHaveBeenCalledWith('status.in.(unpaid,active,paused,expired),cancel_kind.eq.stopped');
  });
});
