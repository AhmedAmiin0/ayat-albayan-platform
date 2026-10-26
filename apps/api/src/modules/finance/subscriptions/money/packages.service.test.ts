import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../../common/audit/audit.service';
import type { BalanceQueries, BalanceRow } from './balance.queries';
import { PackagesService } from './packages.service';
import type { SubRow, SubscriptionsQueries } from '../subscriptions.queries';

const sub = (id: string, patch: Partial<SubRow> = {}): SubRow =>
  ({
    id,
    student_id: 's1',
    student: { id: 's1', code: 'AB-0001', name: 'سهيلة' },
    package: '4',
    duration: 90,
    lessons_total: 4,
    price: 145,
    currency: 'SAR',
    fx_rate: null,
    fx_date: null,
    price_source: {},
    starts_on: '2026-09-25',
    status: 'unpaid',
    renews_on: null,
    notes: null,
    created_at: '2026-09-25T09:00:00Z',
    ...patch,
  }) as SubRow;
const balance = (id: string, used: number): BalanceRow => ({
  subscription_id: id,
  student_id: 's1',
  lessons_total: 4,
  lessons_used: used,
  remaining: 4 - used,
  is_last: true,
  ended_at: null,
  projected_end_at: null,
});

function setup(rows: SubRow[], paid: Map<string, number>) {
  const subs = {
    forStudent: vi.fn(async () => rows),
    paid: vi.fn(async () => paid),
    update: vi.fn(async () => null),
  };
  const balances = { forSubscriptions: vi.fn(async () => new Map(rows.map((r) => [r.id, balance(r.id, 1)]))) };
  const audit = { record: vi.fn(async () => undefined) };
  const service = new PackagesService(
    subs as unknown as SubscriptionsQueries,
    balances as unknown as BalanceQueries,
    audit as unknown as AuditService,
  );
  return { service, subs, audit };
}

describe('PackagesService.recompute (journey 3: a full payment → active)', () => {
  it('writes and audits each derived status change, returns the new statuses', async () => {
    const { service, subs, audit } = setup([sub('a')], new Map([['a', 145]]));
    const { rows } = await service.recompute('s1', 'admin-1');
    expect(subs.update).toHaveBeenCalledWith('a', { status: 'active' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-1', entityId: 'a', action: 'status_change', after: { status: 'active' } }),
    );
    expect(rows[0]?.status).toBe('active');
  });

  it('nothing changes → no write, no audit (idempotent)', async () => {
    const { service, subs, audit } = setup([sub('a', { status: 'active' })], new Map([['a', 145]]));
    await service.recompute('s1', null);
    expect(subs.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('PackagesService.studentBalance (S6)', () => {
  it('packages oldest first, the newest is current, remaining summed', async () => {
    const { service } = setup([sub('a', { status: 'active' }), sub('b')], new Map([['a', 145]]));
    const view = await service.studentBalance('s1');
    expect(view.packages.map((p) => p.id)).toEqual(['a', 'b']);
    expect(view.current?.id).toBe('b');
    expect(view.remaining).toBe(6);
    expect(view.packages[0]).toMatchObject({ paid: 145, price: 145, balance: { lessons_used: 1, remaining: 3 } });
  });

  it('no packages → current null, nothing left', async () => {
    const { service } = setup([], new Map());
    expect(await service.studentBalance('s1')).toEqual({ student_id: 's1', remaining: 0, current: null, packages: [] });
  });
});
