import type { StudentRecordingView } from '@ab/shared';

// Test fixture (not shipped; imported by tests only).

export const recordingView = (over: Partial<StudentRecordingView> = {}): StudentRecordingView => ({
  id: 'rec-1',
  lesson_id: 'les-1',
  lesson_starts_at: '2026-10-05T16:00:00.000Z',
  started_at: '2026-10-05T16:00:00.000Z',
  teacher: { id: 't-1', display_name_ar: 'أ. منى' },
  status: 'done',
  duration_seconds: 3600,
  size_bytes: 52_428_800,
  media: 'video',
  visible_to_student: false,
  can_manage: true,
  url: 'https://signed.example.test/r.mp4',
  ...over,
});

export const pageOf = (items: StudentRecordingView[], total = items.length) => ({ items, total, page: 1, pageSize: 10 });
