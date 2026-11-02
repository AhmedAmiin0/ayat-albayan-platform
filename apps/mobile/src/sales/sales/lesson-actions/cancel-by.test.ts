import { scheduleLesson } from '@/sales/sales/testing/fixtures';
import { offersCancel, salesCancelRights } from './cancel-by';

// 1 Oct 16:20 Riyadh; the lesson runs 16:00–16:45.
const NOW = new Date('2026-10-01T13:20:00Z');
const AFTER = new Date('2026-10-01T14:00:00Z');
const lesson = scheduleLesson({ starts_at: '2026-10-01T13:00:00.000Z', ends_at: '2026-10-01T13:45:00.000Z' });
const on = { now: NOW, holds: true, required: true };
const off = { ...on, required: false };

test('required (as before): the academy only, and only until the end; a completed lesson stays correctable', () => {
  expect(salesCancelRights(lesson, on)).toEqual({ cancelBy: ['admin'], correct: false });
  const after = salesCancelRights(lesson, { ...on, now: AFTER });
  expect(after).toEqual({ cancelBy: [], correct: false });
  // Held automatically before the setting went back ON: still fixable (the API checks auto_held).
  expect(salesCancelRights({ ...lesson, status: 'completed' }, on).correct).toBe(true);
});

test('not required: the three before the end, the teacher or the student after it', () => {
  expect(salesCancelRights(lesson, off).cancelBy).toEqual(['admin', 'teacher', 'student']);
  expect(salesCancelRights(lesson, { ...off, now: AFTER }).cancelBy).toEqual(['teacher', 'student']);
});

test('a held lesson offers the correction; a closed one nothing; no key or no student, nothing', () => {
  expect(salesCancelRights({ ...lesson, status: 'completed' }, off)).toEqual({ cancelBy: [], correct: true });
  expect(offersCancel(salesCancelRights({ ...lesson, status: 'cancelled_by_admin' }, off))).toBe(false);
  expect(offersCancel(salesCancelRights(lesson, { ...off, holds: false }))).toBe(false);
  expect(offersCancel(salesCancelRights({ ...lesson, students: [] }, off))).toBe(false);
});
