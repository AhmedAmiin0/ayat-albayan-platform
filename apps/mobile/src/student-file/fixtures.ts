import type { StudentRecordingView, StudentRecordingsPage } from '@ab/shared';

// Test-only API answers for src/student-file/*.test.tsx.

export function recording(over: Partial<StudentRecordingView> = {}): StudentRecordingView {
  return {
    id: 'r1',
    lesson_id: 'l1',
    lesson_starts_at: '2026-10-04T14:00:00Z',
    started_at: '2026-10-04T14:01:00Z',
    teacher: { id: 't1', display_name_ar: 'أبرار', display_name_en: 'Abrar' },
    status: 'done',
    duration_seconds: 1800,
    size_bytes: 48 * 1024 * 1024,
    media: 'audio',
    visible_to_student: false,
    can_manage: true,
    url: 'https://files.test/r1.mp3?t=1',
    ...over,
  };
}

export const recordingsPage = (items: StudentRecordingView[]): StudentRecordingsPage => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 10,
});
