import { describe, expect, it } from 'vitest';
import { myEarningRoutes, teacherEarningRoutes } from '../earnings.routes';
import { balance, earning, pageOf, payment, summary } from './earnings.fixtures';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;

describe('teacherEarningRoutes and myEarningRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(teacherEarningRoutes).map(line)).toEqual([
      'GET /teacher-earnings/summary',
      'POST /teacher-earnings/resync',
      'POST /teacher-earnings/payments/:id/void',
      'GET /teacher-earnings/payments/:id/receipt',
      'GET /teacher-earnings/:teacherId',
      'GET /teacher-earnings/:teacherId/sessions',
      'GET /teacher-earnings/:teacherId/payments',
      'POST /teacher-earnings/:teacherId/payments',
      'POST /teacher-earnings/:teacherId/receipt-upload-url',
    ]);
    expect(Object.values(myEarningRoutes).map(line)).toEqual([
      'GET /teachers/me/earnings',
      'GET /teachers/me/earnings/sessions',
      'GET /teachers/me/earnings/payments',
      'GET /teachers/me/earnings/payments/:id/receipt',
    ]);
  });

  it('answers the balance, sessions, payments and summary as the api builds them', () => {
    const r = teacherEarningRoutes;
    expect(r.balance.response.parse(balance)).toEqual(balance);
    expect(r.sessions.response.parse(pageOf(earning))).toEqual(pageOf(earning));
    expect(myEarningRoutes.payments.response.parse(pageOf(payment))).toEqual(pageOf(payment));
    expect(r.summary.response.parse(summary)).toEqual(summary);
    expect(r.void.response.parse(payment)).toEqual(payment);
    expect(r.record.response.parse({ payment, replayed: false })).toEqual({
      payment,
      replayed: false,
    });
  });

  it('refuses an answer outside the earning statuses or in another currency', () => {
    const r = teacherEarningRoutes.sessions.response;
    expect(r.safeParse(pageOf({ ...earning, status: 'owed' })).success).toBe(false);
    expect(r.safeParse(pageOf({ ...earning, currency: 'USD' })).success).toBe(false);
  });

  it('takes a resync and a void sent without a body as an empty one', () => {
    expect(teacherEarningRoutes.resync.body.parse(undefined)).toEqual({});
    expect(teacherEarningRoutes.resync.body.parse(null)).toEqual({});
    expect(teacherEarningRoutes.void.body.safeParse(undefined).error?.issues[0]?.path).toEqual([
      'reason',
    ]);
  });

  it('refuses a teacher id that is not a uuid', () => {
    const params = teacherEarningRoutes.balance.params;
    expect(params.safeParse({ teacherId: 'me' }).success).toBe(false);
  });
});
