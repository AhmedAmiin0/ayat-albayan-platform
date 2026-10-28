import { describe, expect, it } from 'vitest';
import { courseLessonCount } from './course.js';

// Owner 2026-10-28: 1 of 8 taken before the platform → the course books 7.
describe('courseLessonCount', () => {
  it('lessons_total − lessons_used_before', () => {
    expect(courseLessonCount({ lessons_total: 8, lessons_used_before: 1 })).toBe(7);
  });

  it('absent or 0 → the whole package', () => {
    expect(courseLessonCount({ lessons_total: 8 })).toBe(8);
    expect(courseLessonCount({ lessons_total: 8, lessons_used_before: 0 })).toBe(8);
  });
});
