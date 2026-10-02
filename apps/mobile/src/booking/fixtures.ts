import type { BookingResult, BookingTeacherOption, SlotView } from '@ab/shared';
import type { TrialDraft } from './draft';

// Invented test rows in the GET /booking/* and POST /booking shapes (no real people).

export const maryam: BookingTeacherOption = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name_ar: 'مريم المعلمة',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  students_count: 3,
  max_students: 10,
  has_availability: true,
};

export const noAvailability: BookingTeacherOption = {
  ...maryam,
  id: '22222222-2222-4222-8222-222222222222',
  display_name_ar: 'سارة المعلمة',
  students_count: 0,
  max_students: null,
  has_availability: false,
};

/** Sunday 4 Oct 2026: 17:00 Riyadh, 18:00 Dubai. */
export const SUN_17 = '2026-10-04T14:00:00.000Z';
/** Monday 5 Oct 2026: 19:00 Riyadh. */
export const MON_19 = '2026-10-05T16:00:00.000Z';

export function slot(startsAt: string, busy = false): SlotView {
  const ends = new Date(Date.parse(startsAt) + 45 * 60_000).toISOString();
  return {
    starts_at: startsAt,
    ends_at: ends,
    conflicts: busy ? [{ kind: 'teacher_busy', startsAt, endsAt: ends }] : [],
  };
}

export function booked(startsAt: string): BookingResult {
  return {
    rule_id: '33333333-3333-4333-8333-333333333333',
    student_ids: ['44444444-4444-4444-8444-444444444444'],
    guardian_ids: ['55555555-5555-4555-8555-555555555555'],
    lessons: [
      {
        id: '66666666-6666-4666-8666-666666666666',
        starts_at: startsAt,
        ends_at: new Date(Date.parse(startsAt) + 45 * 60_000).toISOString(),
      },
    ],
    message_ids: ['77777777-7777-4777-8777-777777777777'],
  };
}

export const LEAD_ID = '88888888-8888-4888-8888-888888888888';

export function draft(patch: Partial<TrialDraft> = {}): TrialDraft {
  return {
    leadId: LEAD_ID,
    studentName: 'يوسف',
    guardianName: 'أم يوسف',
    phone: '+971501234567',
    tz: 'Asia/Dubai',
    program: 'quran',
    gender: 'female',
    teacher: maryam,
    startsAt: SUN_17,
    ...patch,
  };
}
