import { PACKAGE_GUARDIAN_ONLY } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { balanceView, PAYMENTS } from './portal.family.fakes';
import { portalApp, S1, S2, S3 } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
const url = (id: string) => `/portal/students/${id}/package`;
/** Staff-only money internals: never on the family's package. */
const INTERNAL = /price|fx_rate|notes|quote|receipt|recorded_by|method|invoice|سر/;

// docs/50 §2, §5: the package with its money for a guardian or an adult student; a child never.
describe('GET /portal/students/:id/package (family money)', () => {
  let t: App;
  beforeAll(async () => {
    t = await portalApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('a guardian and an adult student: lessons used and left, amount due, payments, instructions', async () => {
    for (const [who, id] of [['guardianA', S1], ['adult', S2]] as const) {
      const res = await t.call('GET', url(id), who);
      expect([who, res.statusCode]).toEqual([who, 200]);
      expect(res.json()).toEqual({
        package: {
          package: '8', duration: 30, lessons_total: 8, lessons_used: 3, remaining: 5,
          starts_on: '2026-10-01', renews_on: '2026-11-01', status: 'active',
          amount_due: { amount: 90, currency: 'SAR' },
        },
        payments: PAYMENTS,
        payment_instructions: 'تحويل',
      });
      expect(res.body).not.toMatch(INTERNAL);
      expect(t.money.studentBalance).toHaveBeenLastCalledWith(id);
    }
  });

  it('none left past every package reads 0; no package is null with the payments kept', async () => {
    const over = balanceView();
    t.money.studentBalance.mockResolvedValueOnce({ ...over, remaining: -2 });
    expect((await t.call('GET', url(S1), 'guardianA')).json().package.remaining).toBe(0);
    t.money.studentBalance.mockResolvedValueOnce({ ...over, current: null, packages: [] });
    const empty = (await t.call('GET', url(S1), 'guardianA')).json();
    expect(empty).toEqual({ package: null, payments: PAYMENTS, payment_instructions: 'تحويل' });
  });

  it('a child\'s own login: 403 package_guardian_only, nothing of the money read', async () => {
    const res = await t.call('GET', url(S1), 'student1');
    expect([res.statusCode, res.json().code]).toEqual([403, PACKAGE_GUARDIAN_ONLY]);
    expect(t.money.studentBalance).not.toHaveBeenCalled();
    expect(t.packages.payments).not.toHaveBeenCalled();
  });

  it('another family\'s student: 404 student_not_found (also for a child login)', async () => {
    for (const [who, id] of [['guardianB', S1], ['guardianA', S3], ['student1', S2]] as const) {
      const res = await t.call('GET', url(id), who);
      expect([who, res.statusCode, res.json().code]).toEqual([who, 404, 'student_not_found']);
    }
    expect(t.money.studentBalance).not.toHaveBeenCalled();
  });
});
