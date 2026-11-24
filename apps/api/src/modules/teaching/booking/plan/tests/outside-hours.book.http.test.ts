import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { outsideApp, TRIAL } from '@/modules/teaching/booking/plan/tests/outside-hours.http.fakes';

const FLAGGED = { ...TRIAL, outsideHours: true };

describe('POST booking with outsideHours («وقت آخر»): the roles that book today', () => {
  let rig: Awaited<ReturnType<typeof outsideApp>>;
  beforeAll(async () => {
    rig = await outsideApp();
  }, 60_000);
  afterAll(() => rig.app.close());
  beforeEach(() => rig.reset());

  it('admin and sales book with the flag: it reaches the booking service', async () => {
    vi.useFakeTimers({ now: new Date('2026-12-01T08:00:00Z'), toFake: ['Date'] });
    try {
      const admin = await rig.call({
        method: 'POST',
        url: '/booking',
        token: 'admin',
        body: FLAGGED,
      });
      const sales = {
        method: 'POST' as const,
        url: '/sales/booking',
        token: 'sales',
        body: FLAGGED,
      };
      expect([admin.statusCode, (await rig.call(sales)).statusCode]).toEqual([201, 201]);
    } finally {
      vi.useRealTimers();
    }
    for (const [req] of rig.booking.book.mock.calls)
      expect(req).toMatchObject({ outsideHours: true });
    expect(rig.booking.book).toHaveBeenCalledTimes(2);
  });

  it('a teacher is 403 on both bookings; nothing is booked', async () => {
    for (const url of ['/booking', '/sales/booking']) {
      const res = await rig.call({ method: 'POST', url, token: 'teacher', body: FLAGGED });
      expect(res.statusCode).toBe(403);
    }
    expect(rig.booking.book).not.toHaveBeenCalled();
  });

  it('outsideHours must be a boolean (400)', async () => {
    const body = { ...TRIAL, outsideHours: 'yes' };
    const res = await rig.call({ method: 'POST', url: '/booking', token: 'admin', body });
    expect(res.statusCode).toBe(400);
    expect(rig.booking.book).not.toHaveBeenCalled();
  });
});
