import { vi } from 'vitest';
import type { EventLesson } from './writers/calendar/event-format';
import type { SyncItem } from './sync/google-items.queries';
import type { ReportSource } from './sync/google-sync.source';

// Test-only builders for the writers' inputs. Obviously fake ids and names, never real data.

export const LESSON_ID = '00000000-0000-4000-8000-000000000101';
export const REPORT_ID = '00000000-0000-4000-8000-000000000201';
export const STUDENT_ID = '00000000-0000-4000-8000-000000000301';
export const TEACHER_ID = '00000000-0000-4000-8000-000000000401';

export function item(over: Partial<SyncItem> = {}): SyncItem {
  return {
    id: 'item-1', kind: 'teacher_event', subject_id: LESSON_ID, lesson_id: LESSON_ID, report_id: null, student_id: null,
    google_id: null, google_parent_id: null, content_hash: null, state: 'pending', attempts: 0, claim_token: 'claim-1', ...over,
  };
}

export function eventLesson(over: Partial<EventLesson> = {}): EventLesson {
  return {
    id: LESSON_ID, startsAt: '2026-10-25T14:00:00Z', endsAt: '2026-10-25T14:45:00Z', status: 'confirmed', teacherName: 'Teacher A',
    students: [{ name: 'طالب تجربة', phone: '+966500000001' }], link: 'https://meet.google.com/abc-defg-hij', kind: 'package', byday: [0], ...over,
  };
}

export function reportSource(over: Partial<ReportSource> = {}): ReportSource {
  return {
    reportId: REPORT_ID, studentId: STUDENT_ID, studentName: 'طالب تجربة', studentProgram: 'quran', teacherName: 'Teacher A',
    startsAt: '2026-10-21T14:00:00Z', meetingLink: null, seq: 3,
    report: { attendance: 'on_time', program: 'quran', recited: 'الفاتحة', new_memorization: null, revision: null, grade_overall: 'excellent', notes: null, homework: null },
    pdfPath: `${STUDENT_ID}/${LESSON_ID}.pdf`, pdfReady: true, version: 1, exportable: true, ...over,
  };
}

/** The sync's data facade with every query mocked; account defaults to a confirmed Drive root. */
export function fakeData() {
  const account = {
    get: vi.fn().mockResolvedValue({ status: 'connected', root_folder_id: 'Root_ABCDEFGHIJ', summary_sheet_id: 'Summary_ABCDEFGHIJ', drive_confirmed_at: '2026-10-22T00:00:00Z', discovery: null }),
    update: vi.fn(), token: vi.fn(), setToken: vi.fn(), clearToken: vi.fn(), setNonce: vi.fn(), consumeNonce: vi.fn(),
  };
  const settings = { read: vi.fn().mockResolvedValue({ enabled: true, mode: 'live', window_days: 60 }), write: vi.fn() };
  const items = { claim: vi.fn(), finish: vi.fn(), release: vi.fn(), sibling: vi.fn(), requeue: vi.fn(), requeueReportRows: vi.fn(), touch: vi.fn(), reconcile: vi.fn(), retry: vi.fn(), counts: vi.fn() };
  return { account, settings, items };
}
