import { describe, expect, it } from 'vitest';
import type { Permission } from '@ab/catalog';
import { canSalesChangeLesson } from './teacher-filter.js';

const NOW = new Date('2026-10-12T14:00:00.000Z');
const all = () => true;
const only = (key: Permission) => (p: Permission) => p === key;
const lesson = {
  status: 'confirmed' as const,
  ends_at: '2026-10-12T15:00:00.000Z',
  students: [{ id: 'st1', code: 'AB-0183', name: 'يوسف' }],
};
const none = { reschedule: false, cancel: false };
const both = { reschedule: true, cancel: true };

describe('canSalesChangeLesson «تغيير الموعد» / «إلغاء الحلقة» (docs/16 row 37)', () => {
  it('an open lesson not over yet, ANY student\'s (a confirmed trial too): both with both keys', () => {
    expect(canSalesChangeLesson(lesson, { now: NOW, can: all })).toEqual(both);
    expect(canSalesChangeLesson({ ...lesson, status: 'scheduled' }, { now: NOW, can: all })).toEqual(both);
  });

  it('each action behind its own key; no key, nothing', () => {
    const cancelOnly = canSalesChangeLesson(lesson, { now: NOW, can: only('lessons.cancel') });
    expect(cancelOnly).toEqual({ reschedule: false, cancel: true });
    const moveOnly = canSalesChangeLesson(lesson, { now: NOW, can: only('lessons.reschedule') });
    expect(moveOnly).toEqual({ reschedule: true, cancel: false });
    expect(canSalesChangeLesson(lesson, { now: NOW, can: () => false })).toEqual(none);
  });

  it('an ended, a closed or a student-less lesson: nothing', () => {
    expect(canSalesChangeLesson(lesson, { now: new Date(lesson.ends_at), can: all })).toEqual(none);
    for (const status of ['completed', 'cancelled_by_admin', 'rescheduled', 'no_show'] as const) {
      expect(canSalesChangeLesson({ ...lesson, status }, { now: NOW, can: all })).toEqual(none);
    }
    expect(canSalesChangeLesson({ ...lesson, students: [] }, { now: NOW, can: all })).toEqual(none);
  });
});
