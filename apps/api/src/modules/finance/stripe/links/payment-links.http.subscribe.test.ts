import { daysBefore, riyadhToday } from '@ab/shared';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { badRequest } from '../../../../common/http/errors';
import { STUDENT_ID, subRow, WEEKLY_SA } from '../../subscriptions/money/money.fakes';
import { resetMocks, SALES_A, type Mocks } from '../../subscriptions/test-app';
import { stripeApp } from '../testing/stripe-app.fakes';
import { linkRow, REQ, stripeDefaults, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
  process.env.API_PUBLIC_URL = 'https://api.test.example';
});

const TEACHER = '7a000000-0000-4000-8000-0000000000aa';
const BODY = { studentId: STUDENT_ID, pricing: { tier: 'weekly' }, amount: 120, currency: 'SAR', clientRequestId: REQ };
const OWN = { leadIds: [], guardianIds: [], studentIds: [STUDENT_ID], phones: [] };

// «اشتراك جديد» → «دفع إلكتروني» (owner 2026-10-29): the link carries the subscribe step's teacher and used lessons.
describe('POST /sales/payment-links with the subscribe step’s «المعلم/ة» and «حلقات مستخدمة»', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let call: Awaited<ReturnType<typeof stripeApp>>['call'];
  const create = (patch: object) => call({ method: 'POST', url: '/sales/payment-links', token: 'salesA', body: { ...BODY, ...patch } });

  beforeAll(async () => ({ app, m, s, call } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
    m.pricing.quote.mockResolvedValue(WEEKLY_SA);
    m.subs.insert.mockResolvedValue(subRow({ price: 120 }));
    m.subs.get.mockResolvedValue(subRow({ price: 120 }));
    m.sales.ownership.mockResolvedValue(OWN);
  });

  it('a teacher: checked active before the package, assigned once the link exists, she is the actor', async () => {
    const res = await create({ teacherId: TEACHER });
    expect(res.statusCode).toBe(201);
    expect(s.teachers.ensureActive).toHaveBeenCalledWith(TEACHER);
    expect(s.teachers.assign).toHaveBeenCalledWith({ studentId: STUDENT_ID, teacherId: TEACHER, actorId: SALES_A.id });
    const [checked] = s.teachers.ensureActive.mock.invocationCallOrder;
    const [inserted] = m.subs.insert.mock.invocationCallOrder;
    expect(checked).toBeLessThan(inserted ?? 0);
  });

  it('a teacher gone inactive: 400 teacher_not_found, no package, no link, nothing assigned', async () => {
    s.teachers.ensureActive.mockRejectedValueOnce(badRequest('teacher_not_found'));
    const res = await create({ teacherId: TEACHER });
    expect([res.statusCode, res.json().code]).toEqual([400, 'teacher_not_found']);
    expect(m.subs.insert).not.toHaveBeenCalled();
    expect(s.links.insert).not.toHaveBeenCalled();
    expect(s.teachers.assign).not.toHaveBeenCalled();
  });

  it('a teacher for a student not hers: 403 not_your_student, no package, no link, nothing assigned', async () => {
    m.sales.ownership.mockResolvedValue({ ...OWN, studentIds: [] });
    const res = await create({ teacherId: TEACHER });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    expect(m.subs.insert).not.toHaveBeenCalled();
    expect(s.links.insert).not.toHaveBeenCalled();
    expect(s.teachers.assign).not.toHaveBeenCalled();
  });

  it('the assignment failed after the link was made: the retry with the same form id assigns', async () => {
    s.teachers.assign.mockRejectedValueOnce(new Error('db down'));
    expect((await create({ teacherId: TEACHER })).statusCode).toBe(500);
    s.links.byRequest.mockResolvedValueOnce(linkRow());
    expect((await create({ teacherId: TEACHER })).statusCode).toBe(201);
    expect(s.teachers.assign).toHaveBeenCalledTimes(2);
    expect(s.teachers.assign).toHaveBeenLastCalledWith({ studentId: STUDENT_ID, teacherId: TEACHER, actorId: SALES_A.id });
    expect(m.subs.insert).toHaveBeenCalledTimes(1);
  });

  it('the kind is the server’s: renewal once a priced package exists, else new', async () => {
    s.links.student.mockResolvedValueOnce({ broughtBy: null, priced: ['older-package'] });
    expect((await create({})).statusCode).toBe(201);
    expect(s.links.insert).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'renewal' }));
    expect((await create({ kind: 'new' })).statusCode).toBe(201);
    expect(s.links.insert).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'new' }));
  });

  it('no teacher sent: nothing checked or assigned', async () => {
    expect((await create({})).statusCode).toBe(201);
    expect(s.teachers.ensureActive).not.toHaveBeenCalled();
    expect(s.teachers.assign).not.toHaveBeenCalled();
  });

  it('used lessons with a past start reach the package; without a past start 400, nothing made', async () => {
    const past = { startsOn: daysBefore(riyadhToday(new Date()), 3), alreadyStarted: true };
    expect((await create({ ...past, lessonsUsedBefore: 1 })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ lessons_used_before: 1 }));
    m.subs.insert.mockClear();
    const today = await create({ lessonsUsedBefore: 1 });
    expect([today.statusCode, today.json().code]).toEqual([400, 'used_before_needs_past_start']);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });
});
