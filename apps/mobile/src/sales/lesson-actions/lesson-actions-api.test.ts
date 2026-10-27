import type { Permission } from '@ab/shared';
import { scheduleLesson } from '../testing/fixtures';
import { canChangeLesson } from './lesson-actions-api';

const NOW = new Date('2026-10-12T14:00:00.000Z');
const all = () => true;
const mine = scheduleLesson({ students: [{ id: 'st1', code: 'AB-0183', name: 'يوسف أحمد', mine: true }] });

test('an open lesson of one of hers, not over yet, with the keys: both actions', () => {
  expect(canChangeLesson(mine, { now: NOW, can: all })).toEqual({ reschedule: true, cancel: true });
});

test('another family\'s, a mixed group, an ended, a closed lesson: nothing', () => {
  const none = { reschedule: false, cancel: false };
  expect(canChangeLesson(scheduleLesson(), { now: NOW, can: all })).toEqual(none);
  // A group with another family's child: moving it would move and message that family too.
  const mixed = { ...mine, students: [...mine.students, { id: 'st9', code: 'AB-0199', name: 'جنى' }] };
  expect(canChangeLesson(mixed, { now: NOW, can: all })).toEqual(none);
  expect(canChangeLesson(mine, { now: new Date('2026-10-12T15:30:00.000Z'), can: all })).toEqual(none);
  for (const status of ['completed', 'cancelled_by_admin', 'rescheduled', 'no_show'] as const) {
    expect(canChangeLesson({ ...mine, status }, { now: NOW, can: all })).toEqual(none);
  }
});

test('each action follows its own key (the admin may switch one off)', () => {
  const only = (key: Permission) => (p: Permission) => p === key;
  expect(canChangeLesson(mine, { now: NOW, can: only('lessons.cancel') })).toEqual({ reschedule: false, cancel: true });
  expect(canChangeLesson(mine, { now: NOW, can: only('lessons.reschedule') })).toEqual({ reschedule: true, cancel: false });
});
