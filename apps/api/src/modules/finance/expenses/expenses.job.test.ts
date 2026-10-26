import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { ExpensesJob, nextMonthStart } from './expenses.job';
import type { ExpensesQueries } from './expenses.queries';
import { ExpensesSettings } from './expenses.settings';

describe('ExpensesJob («تكرار شهري»)', () => {
  it('next month in Riyadh, across the year end', () => {
    expect(nextMonthStart(new Date('2026-10-05T09:00:00Z'))).toBe('2026-11-01');
    expect(nextMonthStart(new Date('2026-12-31T21:30:00Z'))).toBe('2027-02-01'); // already Jan 1 in Riyadh
    expect(nextMonthStart(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01');
  });

  it('pre-creates next month’s drafts; a DB error is logged, never thrown', async () => {
    const q = { createRecurringDrafts: vi.fn().mockResolvedValue(2) };
    const job = new ExpensesJob(q as unknown as ExpensesQueries, readerOf(ExpensesSettings));
    expect(await job.runOnce(new Date('2026-10-05T09:00:00Z'))).toBe(2);
    expect(q.createRecurringDrafts).toHaveBeenCalledWith('2026-11-01');
    q.createRecurringDrafts.mockRejectedValue(new Error('boom'));
    expect(await job.runOnce()).toBe(0);
  });

  it('settings.academy_timezone decides which month is next', async () => {
    const q = { createRecurringDrafts: vi.fn().mockResolvedValue(0) };
    // 2026-10-31T21:30Z is already November in Riyadh, still October in Cairo.
    const at = new Date('2026-10-31T21:30:00Z');
    await new ExpensesJob(q as unknown as ExpensesQueries, readerOf(ExpensesSettings)).runOnce(at);
    await new ExpensesJob(q as unknown as ExpensesQueries, readerOf(ExpensesSettings, { academy_timezone: 'Africa/Cairo' })).runOnce(at);
    expect(q.createRecurringDrafts.mock.calls).toEqual([['2026-12-01'], ['2026-11-01']]);
  });
});
