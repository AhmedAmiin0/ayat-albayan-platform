import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REQ, stamped, STOPPED, STUDENT, stopApp, SUB } from './course-stop.fakes';

// Review 2026-11-06: the stop committed (stop_owed_amount 150, refund_unattended) but its refund
// did not finish. 400 SAR / 8 lessons, 290 paid by bank: 140 was the refund at the stop.
type App = Awaited<ReturnType<typeof stopApp>>;
const URL = `/students/${STUDENT}/course-stop`;
const BODY = { subscriptionId: SUB, reason: 'سفر الأسرة', clientRequestId: REQ };
const STORED = { stop_owed_amount: 150, stop_owed_choice: 'refund_unattended' };
const refundBody = { ...BODY, refund: { choice: 'unattended' } };

describe('POST /students/:id/course-stop: a refund retried after the stop committed', () => {
  let t: App;
  beforeAll(async () => {
    t = await stopApp();
  }, 60_000);
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  const post = () => t.call({ method: 'POST', url: URL, token: 'admin', body: refundBody });

  it('a lesson ended since: the stored decision is replayed, the original 140 refunded', async () => {
    t.m.repo.subscription.mockResolvedValue({ ...stamped, ...STORED });
    t.m.repo.stop.mockResolvedValue({ ...STOPPED, replayed: true });
    const pkg = { price: 400, lessonsTotal: 8, attended: 4, studentName: 'ط' };
    t.m.refunds.pkg.mockResolvedValue(pkg);
    const res = await post();
    expect([res.statusCode, res.json().refund]).toEqual([
      201,
      { amount: 140, card: 0, manual: 140 },
    ]);
    const owed = { amount: 150, choice: 'refund_unattended' };
    expect(t.m.repo.stop).toHaveBeenCalledWith(expect.objectContaining({ owed }));
  });

  it('the refund throws after the stop committed: the admins’ bell says it is half done', async () => {
    t.m.payments.create.mockRejectedValue(new Error('db_down'));
    const res = await post();
    expect(res.statusCode).toBe(500);
    expect(t.m.repo.stop).toHaveBeenCalledTimes(1);
    expect(t.m.push.notifyAdmins).toHaveBeenCalledWith(
      'payment_due',
      expect.objectContaining({ subject: `course_stop_refund_failed:${REQ}`, bellOnly: true }),
    );
  });
});
