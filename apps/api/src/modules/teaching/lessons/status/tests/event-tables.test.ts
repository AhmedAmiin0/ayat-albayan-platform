import { describe, expect, it } from 'vitest';
import { ATTENDANCES } from '@ab/catalog';
import {
  CANCEL_BY,
  CANCEL_STATUS,
  CORRECT_TO,
  LESSON_EVENT_TARGET,
  STATUS_ROUTE_EVENTS,
} from '@ab/schedule';
import { ATTENDANCE_EVENT } from '@ab/shared';
import { CORRECT_EVENT } from '@/modules/teaching/lessons/auto-held/correction-change';
import { ATTENDANCE } from '@/modules/teaching/lessons/status/outcomes';
import { CANCEL_EVENT } from '@/modules/teaching/lessons/status/transition';

describe('lesson event tables agree with the state machine (docs/62 part 2 §1)', () => {
  it('are decoded frozen', () => {
    expect([ATTENDANCE, CANCEL_EVENT, CORRECT_EVENT].every(Object.isFrozen)).toBe(true);
  });

  it('ATTENDANCE and ATTENDANCE_EVENT are exact inverses', () => {
    expect(STATUS_ROUTE_EVENTS.map((e) => ATTENDANCE_EVENT[ATTENDANCE[e]])).toEqual([
      ...STATUS_ROUTE_EVENTS,
    ]);
    expect(ATTENDANCES.map((a) => ATTENDANCE[ATTENDANCE_EVENT[a]])).toEqual([...ATTENDANCES]);
  });

  it('each correction event lands on its target', () => {
    expect(CORRECT_TO.map((to) => LESSON_EVENT_TARGET[CORRECT_EVENT[to]])).toEqual([...CORRECT_TO]);
  });

  it('each cancel event lands on the cancel status', () => {
    const landed = CANCEL_BY.map((by) => LESSON_EVENT_TARGET[CANCEL_EVENT[by]]);
    expect(landed).toEqual(CANCEL_BY.map((by) => CANCEL_STATUS[by]));
  });
});
