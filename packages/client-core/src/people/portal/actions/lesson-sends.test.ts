import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { portalLessonSends, portalSlotsQuery } from './lesson-sends';

const RESULT = { lesson_id: 'l1', status: 'confirmed', counts: false };
const ids = { studentId: 's 1', lessonId: 'l1' };
const client = () => ({ apiFetch: vi.fn(), apiSend: vi.fn(async (): Promise<unknown> => RESULT) });
const as = (c: object) => c as unknown as ApiClient;

describe('the family lesson sends (owner 2026-11-17)', () => {
  it('posts each action to its route, the answer parsed', async () => {
    const c = client();
    const sends = portalLessonSends(as(c));
    expect(await sends.confirm(ids)).toEqual(RESULT);
    expect(c.apiSend).toHaveBeenLastCalledWith('POST', '/portal/students/s%201/lessons/l1/confirm', undefined);
    await sends.cancel({ ...ids, reason: 'سفر' });
    expect(c.apiSend).toHaveBeenLastCalledWith('POST', '/portal/students/s%201/lessons/l1/cancel', { reason: 'سفر' });
    await sends.cancel(ids);
    expect(c.apiSend).toHaveBeenLastCalledWith('POST', '/portal/students/s%201/lessons/l1/cancel', {});
    await sends.request({ ...ids, startsAt: '2026-11-18T14:30:00.000Z' });
    expect(c.apiSend).toHaveBeenLastCalledWith('POST', '/portal/students/s%201/lessons/l1/request', {
      startsAt: '2026-11-18T14:30:00.000Z',
    });
    await sends.withdraw(ids);
    expect(c.apiSend).toHaveBeenLastCalledWith('POST', '/portal/students/s%201/lessons/l1/withdraw', undefined);
  });

  it('an unexpected answer is refused at the boundary', async () => {
    const c = { apiFetch: vi.fn(), apiSend: vi.fn(async (): Promise<unknown> => ({ ok: true })) };
    await expect(portalLessonSends(as(c)).confirm(ids)).rejects.toThrow();
  });

  it('the slots read: one week, parsed, keyed under the portal', async () => {
    const slots = { tz: 'Africa/Cairo', step_min: 45, slots: [] };
    const c = { apiFetch: vi.fn(async (): Promise<unknown> => slots), apiSend: vi.fn() };
    const q = portalSlotsQuery(as(c))({ ...ids, from: '2026-11-15T21:00:00.000Z', to: '2026-11-22T21:00:00.000Z' });
    expect(q.queryKey[0]).toBe('portal');
    expect(await q.queryFn()).toEqual({ tz: 'Africa/Cairo', step_min: 45, slots: [] });
    expect(c.apiFetch).toHaveBeenCalledWith(
      '/portal/students/s%201/lessons/l1/slots?from=2026-11-15T21%3A00%3A00.000Z&to=2026-11-22T21%3A00%3A00.000Z',
    );
  });
});
