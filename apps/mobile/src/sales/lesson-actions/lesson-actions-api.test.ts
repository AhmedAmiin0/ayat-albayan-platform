import type { Permission } from '@ab/shared';
import { scheduleLesson } from '../testing/fixtures';
import { canChangeLesson } from './lesson-actions-api';

const NOW = new Date('2026-10-12T14:00:00.000Z');
const all = () => true;
const mine = scheduleLesson({ students: [{ id: 'st1', code: 'AB-0183', name: 'يوسف أحمد', mine: true }] });

test('an open lesson of one of hers, not over yet, with the keys: both actions', () => {
  expect(canChangeLesson(mine, { now: NOW, can: all })).toEqual({ reschedule: true, cancel: true });
});

test('another family\'s lesson and a mixed group: both actions too (owner 2026-10-28)', () => {
  const both = { reschedule: true, cancel: true };
  expect(canChangeLesson(scheduleLesson(), { now: NOW, can: all })).toEqual(both);
  const mixed = { ...mine, students: [...mine.students, { id: 'st9', code: 'AB-0199', name: 'جنى' }] };
  expect(canChangeLesson(mixed, { now: NOW, can: all })).toEqual(both);
});

test('an ended, a closed or a student-less lesson: nothing', () => {
  const none = { reschedule: false, cancel: false };
  expect(canChangeLesson(mine, { now: new Date('2026-10-12T15:30:00.000Z'), can: all })).toEqual(none);
  for (const status of ['completed', 'cancelled_by_admin', 'rescheduled', 'no_show'] as const) {
    expect(canChangeLesson({ ...mine, status }, { now: NOW, can: all })).toEqual(none);
  }
  expect(canChangeLesson({ ...mine, students: [] }, { now: NOW, can: all })).toEqual(none);
});

test('each action follows its own key (the admin may switch one off); no key, nothing', () => {
  const only = (key: Permission) => (p: Permission) => p === key;
  expect(canChangeLesson(mine, { now: NOW, can: only('lessons.cancel') })).toEqual({ reschedule: false, cancel: true });
  expect(canChangeLesson(mine, { now: NOW, can: only('lessons.reschedule') })).toEqual({ reschedule: true, cancel: false });
  expect(canChangeLesson(scheduleLesson(), { now: NOW, can: () => false })).toEqual({ reschedule: false, cancel: false });
});
