import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import type { BalanceRepo, BalanceRow } from '@/modules/finance/subscriptions/money/balance.repo';
import { PackagesService } from '@/modules/finance/subscriptions/money/packages.service';
import type { SubRow, SubscriptionsRepo } from '@/modules/finance/subscriptions/shared/subscriptions.repo';
import { subRow } from './money.fakes';

const S1 = '5a000000-0000-4000-8000-000000000011';
const S2 = '5a000000-0000-4000-8000-000000000012';
const S3 = '5a000000-0000-4000-8000-000000000013';

const row = (id: string, studentId: string, startsOn: string): SubRow =>
  subRow({
    id,
    student_id: studentId,
    starts_on: startsOn,
    student: { id: studentId, code: 'AB-0001', name: 'سهيلة' },
  });
const balance = (sub: SubRow, used: number): BalanceRow => ({
  subscription_id: sub.id,
  student_id: sub.student_id,
  lessons_total: sub.lessons_total,
  lessons_used: used,
  remaining: sub.lessons_total - used,
  is_last: true,
  ended_at: null,
  projected_end_at: null,
});

const ALL = [
  row('5b000000-0000-4000-8000-000000000011', S1, '2026-09-01'),
  row('5b000000-0000-4000-8000-000000000012', S2, '2026-09-02'),
  row('5b000000-0000-4000-8000-000000000013', S1, '2026-10-01'),
];

function service() {
  const mine = (ids: readonly string[]) => ALL.filter((r) => ids.includes(r.student_id));
  const subs = {
    forStudent: vi.fn(async (id: string) => mine([id])),
    withStudentFor: vi.fn(async (ids: readonly string[]) => mine(ids)),
    paid: vi.fn(async (rows: readonly SubRow[]) => new Map(rows.map((r) => [r.id, 50]))),
  };
  const balances = {
    forSubscriptions: vi.fn(
      async (ids: readonly string[]) =>
        new Map(ALL.map((r, i) => [r.id, balance(r, i + 1)]).filter(([id]) => ids.includes(id))),
    ),
  };
  const audit = { record: vi.fn() };
  const packages = new PackagesService(
    subs as unknown as SubscriptionsRepo,
    balances as unknown as BalanceRepo,
    audit as unknown as AuditService,
    new PackageEvents(),
  );
  return { packages, subs };
}

describe('PackagesService.studentBalances', () => {
  it('gives each student the same view as studentBalance, in one set of reads', async () => {
    const { packages, subs } = service();
    const many = await packages.studentBalances([S1, S2, S3]);
    const one = await Promise.all([S1, S2, S3].map((id) => packages.studentBalance(id)));
    expect([...many.values()]).toEqual(one);
    expect([...many.keys()]).toEqual([S1, S2, S3]);
    expect(subs.withStudentFor).toHaveBeenCalledTimes(1);
  });

  it('answers an empty map without reading for no students', async () => {
    const { packages, subs } = service();
    expect(await packages.studentBalances([])).toEqual(new Map());
    expect(subs.withStudentFor).not.toHaveBeenCalled();
  });
});
