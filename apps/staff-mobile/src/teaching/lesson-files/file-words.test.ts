import type { LessonAssets } from '@ab/shared';
import { lessonHeadline, recordingMeta } from './file-words';

const clock = { tz: 'Asia/Riyadh', cycle: '24' as const, locale: 'ar' as const };
const lesson = (students: LessonAssets['students']): LessonAssets => ({
  lesson_id: 'l1', starts_at: '2026-11-16T16:00:00.000Z', ends_at: '2026-11-16T16:45:00.000Z',
  students, recordings: [], reports: [], files: [],
});

test('the header: name · code · day, time; a group lesson lists its names', () => {
  const one = lessonHeadline(lesson([{ id: 's', name: 'سلمى', code: 'AB-0123' }]), clock);
  expect(one).toMatch(/^سلمى · AB-0123 · \S+،? 16 نوفمبر، 19:00$/);
  const two = [{ id: 'a', name: 'سلمى', code: null }, { id: 'b', name: 'يوسف', code: null }];
  expect(lessonHeadline(lesson(two), clock)).toMatch(/^سلمى، يوسف · /);
});

test('the recording line: range, duration and size, leaving out what is unknown', () => {
  const rec = {
    started_at: '2026-11-16T16:00:00.000Z', ended_at: '2026-11-16T16:42:10.000Z',
    duration_seconds: 2530, size_bytes: 19 * 1024 * 1024,
  };
  expect(recordingMeta(rec, clock)).toBe('19:00 – 19:42 · المدة: 42:10 · الحجم: 19 ميغابايت');
  const running = { ...rec, ended_at: null, duration_seconds: null, size_bytes: null };
  expect(recordingMeta(running, clock)).toBe('19:00');
});
