import type { PortalLesson, PortalReport, PortalStudent, ReportPageView } from '@ab/shared';

// Sample family data for the app's tests (names made up).

export const student = (over: Partial<PortalStudent> = {}): PortalStudent => ({
  id: '11111111-1111-4111-8111-111111111111',
  code: 'AB-0001',
  name: 'سارة',
  tz: 'Asia/Riyadh',
  contact_is_self: false,
  ...over,
});

const MIN = 60_000;

/** A lesson starting `inMin` minutes from `now`, 45 minutes long, window 10 minutes before. */
export function lesson(now: Date, inMin: number, over: Partial<PortalLesson> = {}): PortalLesson {
  const start = now.getTime() + inMin * MIN;
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    id: '22222222-2222-4222-8222-222222222222',
    starts_at: iso(start),
    ends_at: iso(start + 45 * MIN),
    status: 'confirmed',
    teacher: { display_name_ar: 'فاطمة', display_name_en: null },
    way_in: 'classroom',
    meeting_url: null,
    window: { state: 'early', opens_at: iso(start - 10 * MIN), closes_at: iso(start + 75 * MIN) },
    ...over,
  };
}

/** A report sent at `sentAt`, written by the same teacher, without a recording. */
export const report = (sentAt: Date, over: Partial<PortalReport> = {}): PortalReport => ({
  id: '33333333-3333-4333-8333-333333333333',
  lesson_id: '22222222-2222-4222-8222-222222222222',
  lesson_starts_at: sentAt.toISOString(),
  sent_at: sentAt.toISOString(),
  teacher: { display_name_ar: 'فاطمة', display_name_en: null },
  recording_id: null,
  ...over,
});

const noGrades = {
  recitation: null,
  memorization: null,
  revision: null,
  tajweed: null,
  engagement: null,
  commitment: null,
};

/** A sent report's page: an overall grade, homework to do and no plan yet. */
export const reportPage = (over: Partial<ReportPageView['report']> = {}): ReportPageView => ({
  public_id: 'aaaabbbbccccddddeeeeffff00002222',
  student: { name: 'سارة' },
  teacher: { name: 'فاطمة' },
  lesson: { starts_at: '2026-11-04T14:00:00Z', ends_at: '2026-11-04T14:45:00Z' },
  tz: 'Asia/Riyadh',
  report: {
    form_version: 2,
    attendance: 'on_time',
    program: 'quran',
    recited: null,
    new_memorization: null,
    revision: null,
    theory: null,
    grades: noGrades,
    grade_overall: 'excellent',
    notes: null,
    homework: 'مراجعة سورة الملك',
    next_plan: null,
    content: { segments: [], tajweed: null, arabic: null, islamic: null, quick: [] },
    version: 1,
    submitted_at: '2026-11-04T15:00:00Z',
    edited_at: null,
    ...over,
  },
  attachments: [],
  pdf: { url: 'https://files.example/report.pdf' },
});
