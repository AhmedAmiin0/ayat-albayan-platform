import type { PortalLessonAssets, PortalRecording } from '@ab/shared';
import { student } from '#/portal/portal.fixtures.ts';

// Sample recordings for the app's tests (names made up).

export const SARA = student({ id: 's1', name: 'سارة' });

export const rec = (id: string, lesson: string, at = '2026-11-15T14:00:00.000Z'): PortalRecording => ({
  id,
  lesson_id: lesson,
  report_id: `r-${lesson}`,
  lesson_starts_at: at,
  teacher: { display_name_ar: 'فاطمة', display_name_en: null },
  duration_seconds: 2700,
  size_bytes: null,
  media: 'audio',
});

export const lessonPage = (): PortalLessonAssets => ({
  lesson_id: 'L1',
  lesson_starts_at: '2026-11-15T14:00:00.000Z',
  lesson_ends_at: '2026-11-15T14:45:00.000Z',
  teacher: { display_name_ar: 'فاطمة', display_name_en: null },
  report_id: 'r-L1',
  recordings: [rec('A', 'L1')],
  files: [
    {
      id: 'f1', lesson_id: 'L1', kind: 'homework', title: 'صفحة الواجب', mime: 'image/png',
      size: 1_258_291, media: 'image', created_at: '2026-11-15T15:00:00.000Z',
    },
    {
      id: 'f2', lesson_id: 'L1', kind: 'voice_note', title: null, mime: 'audio/mp4',
      size: 600_000, media: 'audio', created_at: '2026-11-15T15:01:00.000Z',
    },
  ],
});
