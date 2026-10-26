// Test-only fakes for «موعد تجريبي جديد»: a real BookingPlanner and TrialDates over vi.fn reads.
import type { StudentStatus } from '@ab/shared';
import { vi } from 'vitest';
import type { LessonEvents } from '../../../../common/events/lesson-events';
import { ruleSettingsOf } from '../../../../common/rules/rule-settings.fakes';
import { fakePolicy } from '../../../messaging/notification-rules/policy/policy.fakes';
import { bookingRequest, fakePlanner, IDS } from '../booking.fakes';
import { fakeTeacherAlert } from '../teacher/teacher-alert.fakes';
import type { TrialLessonRead } from './trial-date.history';
import type { TrialPick } from './trial-date.plan';
import type { TrialDateQueries } from './trial-date.queries';
import { TrialDateDeps, TrialDates } from './trial-date.service';

export const ACTOR = 'a0000000-0000-4000-8000-000000000001';
export const OTHER_TEACHER = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e22';
export const OLD = 'aaaaaaaa-0000-4000-8000-000000000001';
export const REQUEST = 'bbbbbbbb-0000-4000-8000-000000000001';

type LessonOver = Partial<NonNullable<TrialLessonRead['lesson']>> & { attendance?: TrialLessonRead['attendance'] };

/** One trial lesson of S1 (rule package 'trial'), scheduled Mon 2026-10-05 14:00Z with the fakes' teacher. */
export function trialRow(over: LessonOver = {}): TrialLessonRead {
  const { attendance = null, ...lesson } = over;
  return {
    student_id: IDS.s1,
    attendance,
    chargeable: false,
    lesson: {
      id: OLD,
      rule_id: 'rule-old',
      teacher_id: IDS.teacher,
      starts_at: '2026-10-05T14:00:00+00:00',
      ends_at: '2026-10-05T14:30:00+00:00',
      status: 'scheduled',
      created_at: '2026-09-28T09:00:00+00:00',
      created_by: ACTOR,
      rescheduled_from_id: null,
      instant: false,
      makeup_of_id: null,
      rule: { package: 'trial' },
      teacher: { id: IDS.teacher, display_name_ar: 'أبرار', display_name_en: null },
      ...lesson,
    },
  };
}

/** A trial for S1 alone: Sun 2026-10-04 17:00 Riyadh, 30 minutes, with the request id. */
export const trialRequest = (over: Record<string, unknown> = {}) =>
  bookingRequest({ package: 'trial', durationMin: 30, invoice: undefined, studentIds: [IDS.s1], clientRequestId: REQUEST, ...over });

type TrialSetup = { status?: StudentStatus; rows?: TrialLessonRead[]; lessonStudents?: string[] };

export function fakeTrialDates(o: TrialSetup = {}) {
  const deps = fakePlanner();
  const queries = {
    student: vi.fn(async (id: string) => ({ id, status: o.status ?? 'trial', tz: 'Asia/Riyadh', guardian: { tz: 'Europe/London' } })),
    trialLessons: vi.fn(async () => o.rows ?? []),
    names: vi.fn(async () => new Map([[ACTOR, 'سارة']])),
    lessonStudents: vi.fn(async () => o.lessonStudents ?? [IDS.s1]),
    replay: vi.fn(async (): Promise<unknown> => null),
    pick: vi.fn(async (p: TrialPick) => {
      const lesson = p.change?.lessons?.[0];
      return { lesson_id: lesson?.id ?? 'L-new', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:30:00.000Z', teacher_id: p.teacher_id, moved_from_id: lesson ? OLD : null };
    }),
  };
  const alert = fakeTeacherAlert();
  const events = { changed: vi.fn(async () => undefined) };
  const policy = fakePolicy({ settings: ruleSettingsOf({}) });
  const service = new TrialDates(
    queries as unknown as TrialDateQueries,
    deps.planner,
    new TrialDateDeps(policy, alert.after, events as unknown as LessonEvents),
  );
  return { ...deps, trialQueries: queries, alert, events, service };
}
