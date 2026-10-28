import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDENT_ID, subRow, WEEKLY_SA } from './money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from './test-app';

// POST /subscriptions lessonsUsedBefore (owner 2026-10-28, migration 932): only with a start before
// the academy's today; at most lessons_total − 1 (the weekly package has 4).
const NOW = new Date('2026-10-28T10:00:00Z'); // Riyadh today = 2026-10-28

describe('POST /subscriptions lessonsUsedBefore', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    ({ app, m, call } = await moneyApp());
  });
  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
  });
  beforeEach(() => {
    resetMocks(m);
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
    m.pricing.quote.mockResolvedValue(WEEKLY_SA);
    m.subs.insert.mockResolvedValue(subRow({ lessons_used_before: 1 }));
    m.subs.get.mockResolvedValue(subRow({ lessons_used_before: 1 }));
  });

  const create = (patch: object) =>
    call({ method: 'POST', url: '/subscriptions', body: { studentId: STUDENT_ID, pricing: { tier: 'weekly' }, ...patch } });

  it('a past start: stored, audited, returned', async () => {
    const res = await create({ startsOn: '2026-10-27', lessonsUsedBefore: 1 });
    expect(res.statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ lessons_used_before: 1 }));
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ after: expect.objectContaining({ lessons_used_before: 1 }) }));
    expect(res.json().lessons_used_before).toBe(1);
  });

  it('today or later → 400 used_before_needs_past_start, nothing priced', async () => {
    for (const startsOn of ['2026-10-28', '2026-11-01']) {
      const res = await create({ startsOn, lessonsUsedBefore: 1 });
      expect([res.statusCode, res.json().code]).toEqual([400, 'used_before_needs_past_start']);
    }
    expect(m.pricing.quote).not.toHaveBeenCalled();
  });

  it('the whole package → 400 used_before_too_many; 0 with any start is fine', async () => {
    const res = await create({ startsOn: '2026-10-27', lessonsUsedBefore: 4 });
    expect([res.statusCode, res.json().code]).toEqual([400, 'used_before_too_many']);
    expect(m.subs.insert).not.toHaveBeenCalled();
    expect((await create({ startsOn: '2026-11-01', lessonsUsedBefore: 0 })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ lessons_used_before: 0 }));
  });
});
