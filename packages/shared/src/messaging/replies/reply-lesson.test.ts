import { describe, expect, it } from 'vitest';
import type { Permission } from '../../permissions/catalog.js';
import type { ThreadLesson } from '../chat/views.js';
import { replyConfirmPath, replyLesson, replyRights } from './reply-lesson.js';

const NOW = new Date('2026-10-28T12:00:00Z');
const fam = (id: string, starts_at: string, over: Partial<ThreadLesson> = {}): ThreadLesson => ({
  id,
  starts_at,
  ends_at: new Date(Date.parse(starts_at) + 3_600_000).toISOString(),
  status: 'scheduled',
  meeting_link: null,
  student_names: ['ياسين'],
  tz: 'Africa/Cairo',
  ...over,
});
// 2026-10-28 23:30 Riyadh = 20:30 UTC.
const msg = { lesson_id: null, lesson: null, created_at: '2026-10-28T20:30:00Z' };

describe('replyLesson: which lesson a reply is about', () => {
  it('the linked lesson as it is now, ended or not', () => {
    const linked = { ...msg, lesson_id: 'l9', lesson: { starts_at: '2026-10-01T10:00:00Z', ends_at: '2026-10-01T11:00:00Z', status: 'confirmed' as const } };
    expect(replyLesson(linked, { lessons: [fam('a', '2026-10-29T10:00:00Z')], now: NOW })).toEqual({
      id: 'l9',
      starts_at: '2026-10-01T10:00:00Z',
      ends_at: '2026-10-01T11:00:00Z',
      status: 'confirmed',
    });
    expect(replyLesson({ ...linked, lesson: { starts_at: '2026-10-01T10:00:00Z', status: 'scheduled' } }, { lessons: [], now: NOW })?.ends_at).toBeNull();
  });

  it('unlinked: the family’s first open lesson from the message’s Riyadh day on, not ended now', () => {
    const lessons = [fam('later', '2026-10-31T10:00:00Z'), fam('next', '2026-10-29T10:00:00Z'), fam('ended', '2026-10-28T09:00:00Z')];
    expect(replyLesson(msg, { lessons, now: NOW })?.id).toBe('next');
    // Sent yesterday (Riyadh): a lesson running today still counts until it ends.
    const running = fam('running', '2026-10-28T11:30:00Z');
    expect(replyLesson({ ...msg, created_at: '2026-10-27T10:00:00Z' }, { lessons: [running, ...lessons], now: NOW })?.id).toBe('running');
  });

  it('a lesson before the message’s Riyadh day, a closed one, or none: null; an old cache’s is open', () => {
    const early = fam('early', '2026-10-28T20:00:00Z', { ends_at: '2026-10-28T23:00:00Z' });
    expect(replyLesson({ ...msg, created_at: '2026-10-28T21:30:00Z' }, { lessons: [early], now: NOW })).toBeNull();
    expect(replyLesson(msg, { lessons: [fam('x', '2026-10-29T10:00:00Z', { status: 'cancelled_by_admin' })], now: NOW })).toBeNull();
    expect(replyLesson(msg, { lessons: [], now: NOW })).toBeNull();
    const old = fam('old', '2026-10-29T10:00:00Z', { status: undefined, ends_at: undefined });
    expect(replyLesson(msg, { lessons: [old], now: NOW })).toMatchObject({ id: 'old', status: null, ends_at: null });
  });
});

const holder = (...keys: Permission[]) => (k: Permission) => keys.includes(k);

describe('replyRights: what the viewer may do from the chat (docs/16 rows 37, 37b)', () => {
  it('sales: her one-lesson sheet and her confirm route, each behind its key', () => {
    const sales = holder('self.sales', 'self.sales_academy', 'lessons.reschedule', 'lessons.confirm');
    expect(replyRights(sales, 'sales')).toEqual({ reschedule: true, confirm: 'sales' });
    expect(replyRights(holder('self.sales', 'self.sales_academy', 'lessons.status'), 'sales')).toEqual({ reschedule: false, confirm: null });
    expect(replyRights(holder('lessons.reschedule'), 'sales').reschedule).toBe(false);
  });

  it('admin: the admin sheet needs lessons.write, lessons.read and booking.write too; confirm by either route', () => {
    expect(replyRights(holder('lessons.reschedule', 'lessons.write', 'lessons.read', 'booking.write', 'lessons.confirm'), 'admin')).toEqual({ reschedule: true, confirm: 'sales' });
    expect(replyRights(holder('lessons.reschedule', 'lessons.write', 'lessons.read'), 'admin').reschedule).toBe(false);
    expect(replyRights(holder('lessons.reschedule', 'lessons.status'), 'admin')).toEqual({ reschedule: false, confirm: 'admin' });
  });

  it('teacher mode: nothing', () => {
    expect(replyRights(() => true, null)).toEqual({ reschedule: false, confirm: null });
  });

  it('the confirm path of each route', () => {
    expect(replyConfirmPath('l1', 'sales')).toBe('/sales/lessons/l1/confirm');
    expect(replyConfirmPath('l1', 'admin')).toBe('/lessons/l1/confirm');
  });
});
