import { describe, expect, it } from 'vitest';
import {
  CANCEL_BY,
  CANCEL_STATUS,
  cancelBySchema,
  LESSON_EVENT_TARGET,
  LESSON_EVENTS,
  lessonEventSchema,
  STATUS_ROUTE_EVENTS,
  statusRouteEventSchema,
} from '../state-machine';

describe('lesson event schemas', () => {
  it('accept each member of their tuple and nothing else', () => {
    expect(lessonEventSchema.options).toEqual([...LESSON_EVENTS]);
    expect(statusRouteEventSchema.options).toEqual([...STATUS_ROUTE_EVENTS]);
    expect(cancelBySchema.options).toEqual([...CANCEL_BY]);
    expect(lessonEventSchema.validate('cancel')).toBe(false);
  });

  it('decode the event and cancel tables frozen, one status per member', () => {
    expect(Object.isFrozen(LESSON_EVENT_TARGET)).toBe(true);
    expect(Object.isFrozen(CANCEL_STATUS)).toBe(true);
    expect(Object.keys(LESSON_EVENT_TARGET)).toEqual([...LESSON_EVENTS]);
    expect(LESSON_EVENT_TARGET.reschedule).toBe('rescheduled');
  });
});
