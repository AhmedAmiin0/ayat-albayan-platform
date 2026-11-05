import { scheduleLesson } from '@/sales/sales/testing/fixtures';
import { offersCancel, salesCancelRights } from './cancel-by';

// 1 Oct 16:20 Riyadh; the lesson runs 16:00–16:45.
const NOW = new Date('2026-10-01T13:20:00Z');
const AFTER = new Date('2026-10-01T14:00:00Z');
const lesson = scheduleLesson({ starts_at: '2026-10-01T13:00:00.000Z', ends_at: '2026-10-01T13:45:00.000Z' });
const on = { now: NOW, holds: true, required: true };
const off = { ...on, required: false };
const ALL = ['completed', 'no_show', 'excused', 'cancelled_by_teacher'];

test('required (the default): the academy until the end; after it, «تصحيح حالة الحلقة»', () => {
  expect(salesCancelRights(lesson, on)).toEqual({ cancelBy: ['admin'], correct: [] });
  expect(salesCancelRights(lesson, { ...on, now: AFTER })).toEqual({ cancelBy: [], correct: ALL });
});

test('not required: the three before the end, the teacher or the student after it', () => {
  expect(salesCancelRights(lesson, off).cancelBy).toEqual(['admin', 'teacher', 'student']);
  expect(salesCancelRights(lesson, { ...off, now: AFTER }).cancelBy).toEqual(['teacher', 'student']);
});

test('a held / absent lesson offers the three others; closed, no key or no student: nothing', () => {
  const held = salesCancelRights({ ...lesson, status: 'completed' }, { ...on, now: AFTER });
  expect(held).toEqual({ cancelBy: [], correct: ['no_show', 'excused', 'cancelled_by_teacher'] });
  expect(salesCancelRights({ ...lesson, status: 'no_show' }, { ...on, now: AFTER }).correct).toHaveLength(3);
  expect(offersCancel(salesCancelRights({ ...lesson, status: 'cancelled_by_admin' }, off))).toBe(false);
  expect(offersCancel(salesCancelRights(lesson, { ...off, holds: false, now: AFTER }))).toBe(false);
  const alone = { ...lesson, students: [] };
  expect(offersCancel(salesCancelRights(alone, { ...off, now: AFTER }))).toBe(false);
});
