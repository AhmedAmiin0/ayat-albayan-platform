import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CUSTOM_COUNT_DEFAULT, quote, SETTING_DEFAULTS } from '@ab/shared';
import { STUDENT_ID, SUB_ID, subRow } from '../../finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../../finance/subscriptions/test-app';
import { salesDefaults } from './sales-money.fakes';

const SIBLING = '5a000000-0000-4000-8000-0000000000aa';
const URL = '/sales/money/family?phone=%2B966551110000';
const PREMIUM_AE = { ...quote({ tier: 'premium', duration: 60, country: 'AE', students: 1, discount: 10 }), fx: null };
const used = (remaining: number) => ({ subscription_id: SUB_ID, student_id: STUDENT_ID, lessons_total: 4, lessons_used: 4 - remaining, remaining, is_last: true, ended_at: null, projected_end_at: null });

describe('GET /sales/money/family: renew_due and the renewal seed (owner 2026-10-26)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  const family = async () => (await call({ method: 'GET', url: URL, token: 'salesA' })).json().students;

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.family.studentsOfPhone.mockResolvedValue([
      { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', status: 'active' },
      { id: SIBLING, code: 'AB-0184', name: 'أخوها', status: 'expired' },
    ]);
    m.subs.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    m.subs.forStudent.mockResolvedValue([subRow({ status: 'active', price_source: PREMIUM_AE as never, notes: 'x' })]);
  });

  it('active above the renewal alert: not due; the seed is her last package, whitelisted', async () => {
    m.balances.forSubscriptions.mockResolvedValue(new Map([[SUB_ID, used(3)]]));
    const [student, ...rest] = await family();
    expect(rest).toEqual([]);
    expect(m.subs.forStudent).toHaveBeenCalledWith(STUDENT_ID);
    expect(m.subs.forStudent).not.toHaveBeenCalledWith(SIBLING);
    expect(student.renew_due).toBe(false);
    expect(student.renewal).toEqual({ pkg: 'premium', count: CUSTOM_COUNT_DEFAULT, duration: 60, discount: 10, country: 'AE' });
    expect(Object.keys(student)).toEqual(['id', 'code', 'name', 'status', 'mine', 'open', 'renew_due', 'renewal']);
  });

  it('active at the threshold (settings.renewal_alert_remaining) is due; a higher threshold widens it', async () => {
    m.balances.forSubscriptions.mockResolvedValue(new Map([[SUB_ID, used(2)]]));
    expect((await family())[0].renew_due).toBe(true);
    m.balances.forSubscriptions.mockResolvedValue(new Map([[SUB_ID, used(3)]]));
    m.settings.all.mockResolvedValue({ ...SETTING_DEFAULTS, renewal_alert_remaining: 3 });
    expect((await family())[0].renew_due).toBe(true);
  });

  it('a package that ended (pending_renewal) is due whatever is left', async () => {
    m.family.studentsOfPhone.mockResolvedValue([{ id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', status: 'pending_renewal' }]);
    m.balances.forSubscriptions.mockResolvedValue(new Map([[SUB_ID, used(4)]]));
    expect((await family())[0].renew_due).toBe(true);
  });

  it('none of the family is hers: no package or setting is read', async () => {
    m.family.studentsOfPhone.mockResolvedValue([{ id: SIBLING, code: 'AB-0184', name: 'أخوها', status: 'expired' }]);
    expect(await family()).toEqual([]);
    expect(m.subs.forStudent).not.toHaveBeenCalled();
  });
});
