// Test fixtures for the lessons tests (not shipped; excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import type { AuthUser } from '../../common/auth/verify-token';
import type { LessonWriter } from '../scheduling/lesson-writer';
import { STUDENT_ID, TEACHER_ID } from '../scheduling/scheduling.fakes';
import type { LessonRow } from './lesson-row';
import { LessonStore } from './lesson-store';
import type { LessonsQueries } from './lessons.queries';

export { RULE_ID, STUDENT_ID, TEACHER_ID } from '../scheduling/scheduling.fakes';
export const LESSON_ID = '00000000-0000-4000-8000-0000000000d1';
export const GUARDIAN_ID = '00000000-0000-4000-8000-0000000000e1';
export const OTHER_TEACHER_ID = '00000000-0000-4000-8000-0000000000b2';

export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
export const TEACHER: AuthUser = { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };

/** Sunday 2026-10-04 17:00–17:45 Riyadh, scheduled, one student, teacher link. */
export function lessonRow(over: Partial<LessonRow> = {}): LessonRow {
  return {
    id: LESSON_ID,
    rule_id: '00000000-0000-4000-8000-0000000000a1',
    teacher_id: TEACHER_ID,
    starts_at: '2026-10-04T14:00:00+00:00',
    ends_at: '2026-10-04T14:45:00+00:00',
    status: 'scheduled',
    meeting_link: 'https://meet.jit.si/abrar',
    cancel_reason: null,
    override_reason: null,
    confirmed_at: null,
    rescheduled_from_id: null,
    teacher: { id: TEACHER_ID, display_name_ar: 'أبرار', tz: 'Africa/Cairo' },
    lesson_students: [
      {
        student_id: STUDENT_ID,
        attendance: null,
        chargeable: true,
        student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Riyadh' },
      },
    ],
    ...over,
  };
}

export const CONTACT = {
  id: STUDENT_ID,
  name: 'سهيلة',
  guardian: { id: GUARDIAN_ID, phone_e164: '+966501234567', tz: 'Asia/Riyadh' },
};

/** A LessonStore over mocked queries / writer / audit, as the services see it. */
export function fakeStore(row: LessonRow | null = lessonRow()) {
  const queries = {
    get: vi.fn().mockResolvedValue(row),
    openOfRule: vi.fn().mockResolvedValue([]),
    contacts: vi.fn().mockResolvedValue([CONTACT]),
  };
  const writer = { apply: vi.fn().mockResolvedValue(undefined) };
  const record = vi.fn().mockResolvedValue(undefined);
  const store = new LessonStore(
    queries as unknown as LessonsQueries,
    writer as unknown as LessonWriter,
    { record } as unknown as AuditService,
  );
  return { store, queries, writer, record };
}

/** The change set passed to the n-th writer.apply call. */
export const appliedChange = (writer: { apply: ReturnType<typeof vi.fn> }, n = 0) =>
  writer.apply.mock.calls[n]?.[0];
