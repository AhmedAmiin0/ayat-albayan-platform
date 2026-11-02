import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { balanceOf, editApp, URL } from './used-before-edit.test-util';

// «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): the weekly package, 4 lessons, 1 a week: 0..3.
describe('PATCH /subscriptions/:id/lessons-used-before', () => {
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
    edits.courseBooked.mockReset().mockResolvedValue(false);
    edits.setUsedBefore.mockReset().mockResolvedValue(subRow({ lessons_used_before: 2 }));
    m.subs.get
      .mockResolvedValueOnce(subRow())
      .mockResolvedValueOnce(subRow())
      .mockResolvedValue(subRow({ lessons_used_before: 2 }));
  });

  const edit = (body: object, token: 'admin' | 'salesA' | 'teacher' = 'salesA') =>
    call({ method: 'PATCH', url: URL, token, body });

  it('an assistant sets 2: stored only if still 0, audited before / after, the new balance answered', async () => {
    m.balances.forSubscriptions.mockResolvedValueOnce(balanceOf(0)).mockResolvedValue(balanceOf(2));
    const res = await edit({ lessonsUsedBefore: 2 });
    expect(res.statusCode).toBe(200);
    expect(edits.setUsedBefore).toHaveBeenCalledWith({ id: SUB_ID, from: 0, to: 2 });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'subscriptions',
      action: 'update',
      before: expect.objectContaining({ lessons_used_before: 0 }),
      after: expect.objectContaining({ lessons_used_before: 2 }),
    }));
    const lessons = { lessons_total: 4, lessons_used_before: 2, lessons_used: 2, remaining: 2 };
    expect(res.json()).toEqual({ subscription_id: SUB_ID, ...lessons });
    expect(JSON.stringify(res.json())).not.toContain('price');
  });

  it('the admin too', async () => {
    expect((await edit({ lessonsUsedBefore: 1 }, 'admin')).statusCode).toBe(200);
  });

  it('a teacher → 403, nothing read', async () => {
    expect((await edit({ lessonsUsedBefore: 1 }, 'teacher')).statusCode).toBe(403);
    expect(edits.setUsedBefore).not.toHaveBeenCalled();
  });

  it('the whole package or more than one lesson per course day → 400 used_before_too_many', async () => {
    for (const n of [4, 5]) {
      const res = await edit({ lessonsUsedBefore: n });
      expect([res.statusCode, res.json().code]).toEqual([400, 'used_before_too_many']);
    }
    expect(edits.setUsedBefore).not.toHaveBeenCalled();
  });

  it('never more than the lessons still free: 2 taken of 4 → at most 2', async () => {
    m.balances.forSubscriptions.mockResolvedValue(balanceOf(2));
    const res = await edit({ lessonsUsedBefore: 3 });
    expect([res.statusCode, res.json().code]).toEqual([400, 'used_before_too_many']);
  });

  it('a start today or later → 400 used_before_needs_past_start (commission unchanged)', async () => {
    m.subs.get.mockReset().mockResolvedValue(subRow({ starts_on: '2999-01-01' }));
    const res = await edit({ lessonsUsedBefore: 1 });
    expect([res.statusCode, res.json().code]).toEqual([400, 'used_before_needs_past_start']);
    expect(edits.setUsedBefore).not.toHaveBeenCalled();
  });

  it('a booked course → 409 used_before_course_booked (the course keeps its lessons)', async () => {
    edits.courseBooked.mockResolvedValue(true);
    const res = await edit({ lessonsUsedBefore: 1 });
    expect([res.statusCode, res.json().code]).toEqual([409, 'used_before_course_booked']);
    expect(edits.setUsedBefore).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('a cancelled package → 409 already_cancelled', async () => {
    m.subs.get.mockReset().mockResolvedValue(subRow({ status: 'cancelled' }));
    const res = await edit({ lessonsUsedBefore: 1 });
    expect([res.statusCode, res.json().code]).toEqual([409, 'already_cancelled']);
  });

  it('a concurrent change → 409 used_before_changed, nothing audited', async () => {
    edits.setUsedBefore.mockResolvedValue(null);
    const res = await edit({ lessonsUsedBefore: 1 });
    expect([res.statusCode, res.json().code]).toEqual([409, 'used_before_changed']);
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('the same number: no write, no audit row', async () => {
    const res = await edit({ lessonsUsedBefore: 0 });
    expect(res.statusCode).toBe(200);
    expect(edits.setUsedBefore).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('a strict body: 400 for a fraction or an extra key', async () => {
    expect((await edit({ lessonsUsedBefore: 1.5 })).statusCode).toBe(400);
    expect((await edit({ lessonsUsedBefore: 1, price: 0 })).statusCode).toBe(400);
  });

  it('an unknown package → 404', async () => {
    m.subs.get.mockReset().mockResolvedValue(null);
    expect((await edit({ lessonsUsedBefore: 1 })).statusCode).toBe(404);
  });
});
