import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { systemResolver } from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { salesDefaults } from '@/modules/sales/sales-money/sales-money.fakes';
import { balanceOf, editApp, URL } from './used-before-edit.test-util';

// GET /subscriptions/:id/lessons-used-before: what the editor offers (review 2026-11-02), and the
// sales role with subscriptions.set_start_date switched off by the admin (an editable system role).
const withoutKey = async (user: AuthUser) =>
  (await systemResolver(user)).filter((p) => p !== 'subscriptions.set_start_date');

describe('GET /subscriptions/:id/lessons-used-before', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let edits: Awaited<ReturnType<typeof editApp>>['edits'];
  let call: Awaited<ReturnType<typeof editApp>>['call'];

  beforeAll(async () => {
    ({ app, m, call, edits } = await editApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    edits.courseBooked.mockReset().mockResolvedValue(false);
    m.subs.get.mockResolvedValue(subRow({ lessons_used_before: 1 }));
    m.balances.forSubscriptions.mockResolvedValue(balanceOf(2));
  });

  const read = (token: 'salesA' | 'teacher' = 'salesA') => call({ method: 'GET', url: URL, token });

  it('the stored number, the max (4 lessons, 1 on the platform: 3) and nothing blocking', async () => {
    const res = await read();
    expect(res.statusCode).toBe(200);
    const state = { subscription_id: SUB_ID, lessons_used_before: 1, max: 3, blocked: null };
    expect(res.json()).toEqual(state);
  });

  it('a booked course: blocked before anything is typed', async () => {
    edits.courseBooked.mockResolvedValue(true);
    expect((await read()).json().blocked).toBe('used_before_course_booked');
  });

  it('a teacher → 403', async () => {
    expect((await read('teacher')).statusCode).toBe(403);
  });
});

describe('the sales role without subscriptions.set_start_date', () => {
  let app: NestFastifyApplication;
  let call: Awaited<ReturnType<typeof editApp>>['call'];

  beforeAll(async () => {
    ({ app, call } = await editApp(withoutKey));
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET and PATCH → 403', async () => {
    expect((await call({ method: 'GET', url: URL, token: 'salesA' })).statusCode).toBe(403);
    const body = { lessonsUsedBefore: 1 };
    expect((await call({ method: 'PATCH', url: URL, token: 'salesA', body })).statusCode).toBe(403);
  });
});
