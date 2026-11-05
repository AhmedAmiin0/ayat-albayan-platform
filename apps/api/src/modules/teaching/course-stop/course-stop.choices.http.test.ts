import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REQ, STUDENT, stopApp, SUB } from './course-stop.fakes';

// The stop sheet's choices over HTTP (owner 2026-11-06). 400 SAR / 8 lessons, 3 attended at
// 100 % (charge 150), 290 paid by bank. The server computes every amount from the choice.
type App = Awaited<ReturnType<typeof stopApp>>;
const URL = `/students/${STUDENT}/course-stop`;
const BODY = { subscriptionId: SUB, reason: 'سفر الأسرة', clientRequestId: REQ };

describe('POST /students/:id/course-stop: the money choices', () => {
  let t: App;
  beforeAll(async () => {
    t = await stopApp();
  }, 60_000);
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  const post = (body: object, token = 'admin') => t.call({ method: 'POST', url: URL, token, body });
  const owedSent = () => t.m.repo.stop.mock.calls[0]?.[0]?.owed;

  it.each([
    ['unattended', 140, 150],
    ['paid', 290, 0],
  ] as const)('refund %s → %d back; the course then owes the %d left paid (due 0)', async (choice, n, owed) => {
    const res = await post({ ...BODY, refund: { choice } });
    expect(res.json().refund).toEqual({ amount: n, card: 0, manual: n });
    expect(owedSent()).toEqual({ amount: owed, choice: `refund_${choice}` });
  });

  it('a custom refund is planned as typed', async () => {
    await post({ ...BODY, refund: { choice: 'custom', amount: 20 } });
    expect(owedSent()).toEqual({ amount: 270, choice: 'refund_custom' });
  });

  it.each([
    [{ choice: 'attended' }, 150],
    [{ choice: 'price' }, 400],
    [{ choice: 'nothing' }, 0],
    [{ choice: 'custom', amount: 0 }, 0],
    [{ choice: 'custom', amount: 400 }, 400],
  ])('«إلغاء فقط» owe %o → stores %d (sales may choose it too)', async (owe, amount) => {
    const res = await post({ ...BODY, owe }, 'sales');
    expect(res.statusCode).toBe(201);
    expect(owedSent()).toEqual({ amount, choice: owe.choice });
  });

  it('a custom owed amount above the price: 409 owed_exceeds_price, nothing stopped', async () => {
    const res = await post({ ...BODY, owe: { choice: 'custom', amount: 400.01 } });
    expect([res.statusCode, res.json().code]).toEqual([409, 'owed_exceeds_price']);
    expect(t.m.repo.stop).not.toHaveBeenCalled();
  });

  it('refund and owe together, or custom without an amount: 400', async () => {
    const both = { ...BODY, refund: { choice: 'paid' }, owe: { choice: 'nothing' } };
    expect((await post(both)).statusCode).toBe(400);
    expect((await post({ ...BODY, owe: { choice: 'custom' } })).statusCode).toBe(400);
  });
});
