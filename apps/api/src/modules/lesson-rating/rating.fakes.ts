// Test fixtures for the lesson-rating tests (not shipped; *.fakes.ts).
import type { RatingLesson, RatingLessonStudent } from './rating.plan';

export const LESSON_ID = '00000000-0000-4000-8000-0000000000d1';
export const GUARDIAN_ID = '00000000-0000-4000-8000-0000000000a1';
export const OTHER_GUARDIAN_ID = '00000000-0000-4000-8000-0000000000a2';
export const PHONE = '+966501234567';
export const NOW = new Date('2026-10-04T15:00:00Z');

export const guardian = { id: GUARDIAN_ID, phone_e164: PHONE, tz: 'Asia/Riyadh' };

export function child(name: string, over: Partial<RatingLessonStudent> = {}): RatingLessonStudent {
  return { attendance: 'on_time', student: { id: `s-${name}`, name, guardian }, ...over };
}

/** A lesson that took place an hour before NOW. */
export function heldLesson(over: Partial<RatingLesson> = {}): RatingLesson {
  return {
    id: LESSON_ID,
    starts_at: '2026-10-04T14:00:00Z',
    status: 'completed',
    lesson_students: [child('سهيلة')],
    ...over,
  };
}
