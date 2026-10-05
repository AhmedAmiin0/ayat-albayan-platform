import type { LessonStatus, LessonView } from '@ab/shared';

// Test fixture (not a test): one lesson of today as GET /lessons returns it.

export function lessonAt(opts: { id: string; startsAt: string; status?: LessonStatus; student?: string }): LessonView {
  const ends = new Date(Date.parse(opts.startsAt) + 30 * 60_000).toISOString();
  return {
    id: opts.id,
    rule_id: null,
    teacher: { id: 't1', display_name_ar: 'أبرار', tz: 'Asia/Riyadh' },
    starts_at: opts.startsAt,
    ends_at: ends,
    status: opts.status ?? 'confirmed',
    meeting_link: null,
    cancel_reason: null,
    override_reason: null,
    confirmed_at: null,
    rescheduled_from_id: null,
    room_opened_at: null,
    students: [
      { id: `s-${opts.id}`, code: 'AB-0001', name: opts.student ?? 'سارة', tz: 'Asia/Riyadh', attendance: null, chargeable: true, seq: null },
    ],
    allowed_events: [],
    conflicts: [],
    pending_proposal: null,
  };
}
