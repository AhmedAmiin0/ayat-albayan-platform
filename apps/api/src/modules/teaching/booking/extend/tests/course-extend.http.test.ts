import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUIRE_ON } from '@/modules/sales/sales/rule/sales-ownership-rule.fakes';
import { profileApp, S1, SUB_ID } from '@/modules/teaching/booking/profile/profile-course.fakes';

// Lessons without a date are booked after the planned end.
type App = Awaited<ReturnType<typeof profileApp>>;
const URL = `/students/${S1}/course-extend`;
const held = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    ...{ id: `l${i}`, starts_at: `2026-10-${String(10 + i)}T14:00:00Z`, rule_id: 'ra' },
    ...{ local_date: null, status: 'completed', chargeable: true, makeup: false, instant: false },
  }));
const MINE = { leadIds: [], guardianIds: [], studentIds: [S1], phones: [] };

/** Registers the app's hooks in the calling describe; the getter reads it inside a test. */
function hooks(settings?: Parameters<typeof profileApp>[0]): () => App {
  let app: App | undefined;
  beforeAll(async () => {
    app = await profileApp(settings);
  }, 60_000);
  afterAll(() => app?.app.close());
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-17T06:00:00Z'), toFake: ['Date'] });
    app?.reset();
    app?.m.lessons.ofCourse.mockResolvedValue(held(6));
  });
  return () => {
    if (!app) throw new Error('app not booted');
    return app;
  };
}

describe('GET / POST /students/:id/course-extend', () => {
  const t = hooks();
  it('the preview: 2 of 8 left, Wed 18 and Mon 23 Nov at 17:00 Riyadh; nobody is messaged', async () => {
    const res = await t().get('admin', URL);
    expect(res.json()).toEqual({
      subscriptionId: SUB_ID,
      starts: ['2026-11-18T14:00:00.000Z', '2026-11-23T14:00:00.000Z'],
      tz: 'Asia/Riyadh',
      endsOn: '2026-11-23',
      notified: [],
    });
  });

  it('the booking: the latest rules end on the new day, each one topped up', async () => {
    const res = await t().post('sales', URL, { subscriptionId: SUB_ID });
    expect(res.json()).toEqual({ subscriptionId: SUB_ID, inserted: 2, endsOn: '2026-11-23', conflicts: 0 });
    expect(t().m.extendRepo.extendRules).toHaveBeenCalledWith(['ra', 'rb'], '2026-11-23');
    expect(t().m.ruleExtend.extend).toHaveBeenCalledTimes(2);
  });

  it('nothing left: inserted 0, nothing written (a retry is safe)', async () => {
    t().m.lessons.ofCourse.mockResolvedValue(held(8));
    const res = await t().post('admin', URL, { subscriptionId: SUB_ID });
    expect(res.json()).toMatchObject({ inserted: 0, endsOn: '2026-11-10' });
    expect(t().m.extendRepo.extendRules).not.toHaveBeenCalled();
  });

  it('a stopped package is 409 already_cancelled; a teacher 403', async () => {
    t().m.drafts.status.mockResolvedValue('cancelled');
    const res = await t().post('admin', URL, { subscriptionId: SUB_ID });
    expect([res.statusCode, res.json().code]).toEqual([409, 'already_cancelled']);
    expect((await t().get('teacher', URL)).statusCode).toBe(403);
  });
});

describe('«مدّ الجدول» while «اشتراط التعيين» is ON', () => {
  const own = hooks(REQUIRE_ON);
  it("another assistant's student: 403 not_your_student; hers: booked", async () => {
    const res = await own().post('sales', URL, { subscriptionId: SUB_ID });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    own().m.sales.ownership.mockResolvedValue(MINE);
    expect((await own().post('sales', URL, { subscriptionId: SUB_ID })).statusCode).toBe(200);
  });
});
