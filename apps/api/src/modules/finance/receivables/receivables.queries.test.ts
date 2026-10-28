import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../common/db/db.module';
import { ReceivablesQueries } from './receivables.queries';

// «مستحق على الطلاب»: a cancelled package (owner 2026-10-28) is never owed, like a trial one.

describe('receivables OWING', () => {
  it('the packages query reads every status that can owe, never trial or cancelled', async () => {
    const q = { select: vi.fn(), in: vi.fn(), gt: vi.fn(), order: vi.fn(), range: vi.fn() };
    for (const k of ['select', 'in', 'gt', 'order'] as const) q[k].mockReturnValue(q);
    q.range.mockResolvedValue({ data: [], error: null });
    const db = { from: vi.fn(() => q) } as unknown as Db;
    await new ReceivablesQueries(db).packages();
    expect(q.in).toHaveBeenCalledWith('status', ['unpaid', 'active', 'paused', 'expired']);
    expect(q.in.mock.calls[0]?.[1]).not.toContain('cancelled');
  });
});
