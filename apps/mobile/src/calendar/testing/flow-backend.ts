import type { LessonView, OverviewTeacher } from '@ab/shared';
import { SLOTS } from '@/reschedule/fixtures';
import { muscat, pending } from '@/today/testing/fixtures';
import { FakeBackend } from '@/test/fake-backend';
import { abrar, omar } from '../overview/overview-fixtures';

// The teachers + lessons API for the calendar and reschedule flows. Week 26 Sep – 2 Oct 2026
// (Riyadh, UTC+3); «now» is Thursday 1 Oct 16:20 (tests set fake timers to it). Two lessons of
// أبرار (a Cairo teacher) on Thursday: 16:00 waiting and 17:00 confirmed; عمر has nothing booked.

export const NOW = new Date('2026-10-01T13:20:00Z');
export const TEACHER = { id: 't1', display_name_ar: 'أبرار', phone_e164: null, status: 'active', tz: 'Africa/Cairo' };
const TEACHERS: OverviewTeacher[] = [
  { ...abrar, windows: [], free: [] },
  { ...omar, windows: [], free: [] },
];
const MINUTE = 60_000;
const riyadhDate = (iso: string) => new Date(Date.parse(iso) + 3 * 60 * MINUTE).toISOString().slice(0, 10);

export function calendarBackend() {
  const state: { lessons: LessonView[]; slots: typeof SLOTS } = { lessons: [pending, muscat], slots: SLOTS };
  const within = (l: LessonView, from = '', to = '9') => l.starts_at >= from && l.starts_at < to;
  const backend = new FakeBackend()
    .on('GET /teachers', () => ({ items: [{ ...TEACHER, active_count: 0, trial_count: 0 }], total: 1, page: 1, pageSize: 25 }))
    .on('GET /teachers/:id', () => TEACHER)
    .on('GET /teachers/:id/availability', () => [])
    .on('GET /teachers/:id/time-off', () => [])
    .on('GET /students/status-counts', () => ({ new: 0, trial: 0, pending_subscription: 0, active: 0, pending_renewal: 0, expired: 0, paused: 0, churned: 0 }))
    .on('GET /students', () => ({ items: [], total: 0, page: 1, pageSize: 50 }))
    .on('GET /settings', () => ({ renewal_alert_remaining: 2, follow_up_hours: [2, 24, 72] }))
    .on('GET /lessons', ({ query }) =>
      state.lessons.filter((l) => l.teacher.id === query['teacherId'] && within(l, query['from'], query['to'])),
    )
    .on('GET /lessons/overview', ({ query }) => ({
      from: query['from'],
      to: query['to'],
      teachers: TEACHERS,
      lessons: state.lessons.filter((l) => within(l, query['from'], query['to'])),
    }))
    .on('GET /lessons/day', ({ query }) => state.lessons.filter((l) => riyadhDate(l.starts_at) === query['date']))
    .on('GET /booking/slots', () => state.slots)
    .on('POST /lessons/:id/reschedule', ({ params, body }) => {
      const move = body as { scope: 'one' | 'rule'; startsAt?: string; newRule?: { startsOn: string; startTimeLocal: string } };
      const startsAt = move.startsAt ?? `${move.newRule?.startsOn}T14:00:00.000Z`;
      const old = state.lessons.find((l) => l.id === params['id']);
      if (!old) throw new Error('no such lesson');
      const moved: LessonView = { ...old, starts_at: startsAt, ends_at: new Date(Date.parse(startsAt) + 45 * MINUTE).toISOString(), status: 'scheduled' };
      state.lessons = state.lessons.map((l) => (l.id === old.id ? moved : l));
      return moved;
    });
  return { backend, state };
}
