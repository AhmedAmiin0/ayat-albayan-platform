import type { LessonAssets, LessonFileView } from '@ab/shared';

// Test data (not a test): one lesson with a finished recording and one file (names made up).

export const LESSON = '11111111-1111-4111-8111-111111111111';

export const fileView = (over: Partial<LessonFileView> = {}): LessonFileView => ({
  id: 'f-1',
  lesson_id: LESSON,
  kind: 'homework',
  title: 'ورقة الواجب',
  mime: 'image/png',
  size: 838_861,
  media: 'image',
  visible_to_family: true,
  created_at: '2026-11-16T17:00:00.000Z',
  ...over,
});

export const assets = (over: Partial<LessonAssets> = {}): LessonAssets => ({
  lesson_id: LESSON,
  starts_at: '2026-11-16T16:00:00.000Z',
  ends_at: '2026-11-16T16:45:00.000Z',
  students: [{ id: 's-1', name: 'سلمى', code: 'AB-0001' }],
  recordings: [
    {
      id: 'rec-1', status: 'done', duration_seconds: 2640, size_bytes: 22_020_096,
      media: 'audio', visible_to_student: false, url: 'https://files.example/rec.mp3',
    },
  ],
  reports: [],
  files: [fileView()],
  ...over,
});
