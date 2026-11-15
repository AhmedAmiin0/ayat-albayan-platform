import { allowedLessonEvents, type LessonStudentView, type LessonView } from '@ab/shared';

// Test rows in the GET /lessons/day shape (docs/10 §5, LessonView). Thursday 1 Oct 2026; Riyadh is
// UTC+3, so 13:00Z is 16:00 on the spine.

export const yusuf: LessonStudentView = {
  id: 's1',
  code: 'AB-0182',
  name: 'يوسف أحمد',
  tz: 'Asia/Riyadh',
  attendance: null,
  chargeable: true,
  seq: null,
};

export const jana: LessonStudentView = { ...yusuf, id: 's2', code: 'AB-0185', name: 'جنى وليد', tz: 'Asia/Muscat' };

export function lesson(over: Partial<LessonView> & Pick<LessonView, 'id'>): LessonView {
  const status = over.status ?? 'scheduled';
  return {
    rule_id: 'r1',
    teacher: { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo' },
    starts_at: '2026-10-01T13:00:00.000Z',
    ends_at: '2026-10-01T13:45:00.000Z',
    status,
    meeting_link: null,
    cancel_reason: null,
    override_reason: null,
    confirmed_at: null,
    rescheduled_from_id: null,
    students: [yusuf],
    allowed_events: allowedLessonEvents(status),
    conflicts: [],
    pending_proposal: null,
    ...over,
  };
}

/** 10:00–10:45 Riyadh, held. */
export const done = lesson({
  id: 'l-done',
  status: 'completed',
  starts_at: '2026-10-01T07:00:00.000Z',
  ends_at: '2026-10-01T07:45:00.000Z',
  students: [{ ...yusuf, id: 's3', code: 'AB-0170', name: 'جودى خالد' }],
});
/** 16:00 Riyadh, waiting for confirmation. */
export const pending = lesson({ id: 'l-pending' });
/** 17:00 Riyadh, a student in Muscat (18:00 there). */
export const muscat = lesson({
  id: 'l-muscat',
  status: 'confirmed',
  starts_at: '2026-10-01T14:00:00.000Z',
  ends_at: '2026-10-01T15:00:00.000Z',
  students: [jana],
});
/** Cancelled by the admin: hidden from Today. */
export const cancelled = lesson({ id: 'l-cancelled', status: 'cancelled_by_admin' });
