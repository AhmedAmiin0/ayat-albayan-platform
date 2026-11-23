// Test fixtures for the family's recordings and lesson files (test-only). Example data only.
import type { PortalLessonAssets, PortalLessonFile, PortalRecording } from '@ab/shared';

export const recording = (over: Partial<PortalRecording> = {}): PortalRecording => ({
  id: 'A', lesson_id: 'L1', report_id: 'r-L1', lesson_starts_at: '2026-11-15T14:00:00.000Z',
  teacher: { display_name_ar: 'فاطمة', display_name_en: null }, duration_seconds: 2640,
  size_bytes: null, media: 'audio', ...over,
});

export const lessonFile = (over: Partial<PortalLessonFile> = {}): PortalLessonFile => ({
  id: 'f1', lesson_id: 'L1', kind: 'homework', title: 'ورقة الواجب', mime: 'image/png',
  size: 900, media: 'image', created_at: '2026-11-15T15:00:00.000Z', ...over,
});

export const lessonPage = (over: Partial<PortalLessonAssets> = {}): PortalLessonAssets => ({
  lesson_id: 'L1', lesson_starts_at: '2026-11-15T14:00:00.000Z',
  lesson_ends_at: '2026-11-15T14:45:00.000Z', teacher: null, report_id: 'r-L1',
  recordings: [recording()], files: [lessonFile()], ...over,
});

/** A minted link, as POST …/url answers. */
export const signed = (url = 'https://files.example/a') => ({ url, expires_at: 'x' });
