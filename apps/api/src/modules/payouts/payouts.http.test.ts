import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS } from '../../common/settings/settings.values';
import { PAYOUT_ID, payoutRow, TEACHER_ID } from '../subscriptions/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

const TEACHER = { id: TEACHER_ID, tz: 'Africa/Cairo', display_name_ar: 'أبرار', rate_30: 50, rate_45: 70, rate_60: 90, rate_90: null };
const lesson = (id: string, start: string, minutes: number) => ({
  id,
  starts_at: start,
  ends_at: new Date(Date.parse(start) + minutes * 60_000).toISOString(),
  status: 'completed',
});

describe('payouts routes (Y1–Y5, R-PAY-02, R-TCH-04)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payouts.teachers.mockResolvedValue([TEACHER]);
    m.payouts.forMonth.mockResolvedValue([]);
  });

  it('Y2: a draft per teacher from completed lessons in the teacher-tz month × rate', async () => {
    m.payouts.lessons.mockResolvedValue([lesson('l1', '2026-09-10T15:00:00Z', 45), lesson('l2', '2026-09-11T15:00:00Z', 45)]);
    m.payouts.insert.mockResolvedValue(payoutRow());
    const res = await call({ method: 'POST', url: '/payouts/2026-09/generate' });
    expect(res.statusCode).toBe(200);
    expect(m.payouts.lessons).toHaveBeenCalledWith({
      teacherId: TEACHER_ID,
      from: '2026-08-31T21:00:00.000Z',
      to: '2026-09-30T21:00:00.000Z',
      statuses: ['completed'],
    });
    expect(m.payouts.insert).toHaveBeenCalledWith(
      expect.objectContaining({ teacher_id: TEACHER_ID, month: '2026-09-01', lessons_count: 2, amount: 140 }),
    );
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'teacher_payouts', action: 'generate' }));
    expect(res.json()).toMatchObject({ month: '2026-09', missing_rates: [] });
  });

  it('Y2: late lessons count when the owner turns payout_count_late on', async () => {
    m.settings.all.mockResolvedValue({ ...SETTING_DEFAULTS, payout_count_late: true });
    m.payouts.lessons.mockResolvedValue([]);
    await call({ method: 'POST', url: '/payouts/2026-09/generate' });
    expect(m.payouts.lessons).toHaveBeenCalledWith(expect.objectContaining({ statuses: ['completed', 'late'] }));
  });

  it('Y2: an approved row is frozen; a missing rate skips the teacher and is listed', async () => {
    m.payouts.forMonth.mockResolvedValue([payoutRow({ status: 'approved' })]);
    m.payouts.lessons.mockResolvedValue([lesson('l1', '2026-09-10T15:00:00Z', 45)]);
    await call({ method: 'POST', url: '/payouts/2026-09/generate' });
    expect(m.payouts.insert).not.toHaveBeenCalled();
    expect(m.payouts.update).not.toHaveBeenCalled();

    m.payouts.forMonth.mockResolvedValue([]);
    m.payouts.lessons.mockResolvedValue([lesson('l3', '2026-09-12T15:00:00Z', 90)]);
    const res = await call({ method: 'POST', url: '/payouts/2026-09/generate' });
    expect(res.json().missing_rates).toEqual([{ teacher_id: TEACHER_ID, display_name_ar: 'أبرار', durations: [90] }]);
    expect(m.payouts.insert).not.toHaveBeenCalled();
  });

  it('Y2: 400 invalid_month', async () => {
    const res = await call({ method: 'POST', url: '/payouts/2026-13/generate' });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('invalid_month');
  });

  it('Y1: the month rows mapped to PayoutView', async () => {
    m.payouts.forMonth.mockResolvedValue([payoutRow()]);
    const res = await call({ method: 'GET', url: '/payouts?month=2026-09' });
    expect(m.payouts.forMonth).toHaveBeenCalledWith('2026-09-01');
    expect(res.json()).toEqual([
      expect.objectContaining({ month: '2026-09', amount: 140, currency: 'EGP', teacher: { id: TEACHER_ID, display_name_ar: 'أبرار' } }),
    ]);
  });

  it('Y3/Y4: draft → approved → paid, audited; draft → paid is 409 invalid_transition', async () => {
    m.payouts.get.mockResolvedValue(payoutRow());
    const skip = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} });
    expect(skip.statusCode).toBe(409);
    expect(skip.json().code).toBe('invalid_transition');

    m.payouts.update.mockResolvedValue(payoutRow({ status: 'approved', approved_at: '2026-10-02T09:00:00Z' }));
    const ok = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/approve` });
    expect(ok.statusCode).toBe(200);
    expect(m.payouts.update).toHaveBeenCalledWith(PAYOUT_ID, expect.objectContaining({ status: 'approved', from: 'draft' }));

    m.payouts.get.mockResolvedValue(payoutRow({ status: 'approved' }));
    m.payouts.update.mockResolvedValue(payoutRow({ status: 'paid', paid_at: '2026-10-01T09:00:00Z' }));
    const paid = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: { paidAt: '2026-10-01T09:00:00Z' } });
    expect(paid.json()).toMatchObject({ status: 'paid' });
    expect(m.payouts.update).toHaveBeenLastCalledWith(PAYOUT_ID, expect.objectContaining({ paid_at: '2026-10-01T09:00:00Z' }));
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'pay' }));
  });

  it('Y3: 409 month_not_over before the month ends in the teacher tz; 409 reports_pending while reports are missing', async () => {
    m.payouts.get.mockResolvedValue(payoutRow({ month: '2999-01-01' }));
    const early = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/approve` });
    expect(early.statusCode).toBe(409);
    expect(early.json().code).toBe('month_not_over');

    m.payouts.get.mockResolvedValue(payoutRow());
    m.payouts.pendingReports.mockResolvedValue(2);
    const pending = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/approve` });
    expect(pending.json()).toMatchObject({ code: 'reports_pending', count: 2 });
    expect(m.payouts.pendingReports).toHaveBeenCalledWith({
      teacherId: TEACHER_ID,
      from: '2026-08-31T21:00:00.000Z',
      to: '2026-09-30T21:00:00.000Z',
    });
    expect(m.payouts.update).not.toHaveBeenCalled();
  });

  it('Y5: a teacher reads own payouts; unlinked → 404 teacher_not_linked; admin routes refused', async () => {
    m.teachers.idByProfile.mockResolvedValue(TEACHER_ID);
    m.payouts.forTeacher.mockResolvedValue([payoutRow()]);
    const res = await call({ method: 'GET', url: '/teachers/me/payouts?month=2026-09', token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(m.payouts.forTeacher).toHaveBeenCalledWith(TEACHER_ID, '2026-09-01');
    m.teachers.idByProfile.mockResolvedValue(null);
    const none = await call({ method: 'GET', url: '/teachers/me/payouts', token: 'teacher' });
    expect(none.json().code).toBe('teacher_not_linked');
    expect((await call({ method: 'GET', url: '/payouts?month=2026-09', token: 'teacher' })).statusCode).toBe(403);
  });
});
