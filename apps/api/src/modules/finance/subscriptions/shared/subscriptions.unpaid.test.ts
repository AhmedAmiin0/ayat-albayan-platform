import { describe, expect, it, vi } from 'vitest';
import { subRow } from '@/modules/finance/subscriptions/money/tests/money.fakes';
import type { MoneyWrites } from '@/modules/finance/subscriptions/money/money-writes';
import type { PackagesService } from '@/modules/finance/subscriptions/money/packages.service';
import { SubscriptionsService } from './subscriptions.service';
import type { SubRow, SubscriptionsRepo } from './subscriptions.repo';

function serviceOver(rows: SubRow[]) {
  const subs = { withStudentFor: vi.fn(async () => rows) };
  const views = vi.fn(async (r: readonly SubRow[]) => r.map((x) => ({ id: x.id })));
  const service = new SubscriptionsService(
    subs as unknown as SubscriptionsRepo,
    { views } as unknown as PackagesService,
    {} as MoneyWrites,
  );
  return { service, subs, views };
}

describe('SubscriptionsService.unpaidOf: the unpaid packages of several students in one read', () => {
  it('reads every student once and keeps the unpaid packages, newest first as the list sorts', async () => {
    const { service, subs } = serviceOver([
      subRow({ id: 'old', student_id: 's1', created_at: '2026-09-01T00:00:00Z' }),
      subRow({ id: 'paid', student_id: 's1', status: 'active' }),
      subRow({ id: 'b', student_id: 's2', created_at: '2026-10-01T00:00:00Z' }),
      subRow({ id: 'a', student_id: 's2', created_at: '2026-10-01T00:00:00Z' }),
    ]);
    const out = await service.unpaidOf(['s1', 's2']);
    expect(subs.withStudentFor).toHaveBeenCalledTimes(1);
    expect(subs.withStudentFor).toHaveBeenCalledWith(['s1', 's2']);
    expect(out.map((v) => v.id)).toEqual(['a', 'b', 'old']);
  });

  it('makes no read for no student', async () => {
    const { service, subs, views } = serviceOver([]);
    expect(await service.unpaidOf([])).toEqual([]);
    expect(subs.withStudentFor).not.toHaveBeenCalled();
    expect(views).not.toHaveBeenCalled();
  });
});
