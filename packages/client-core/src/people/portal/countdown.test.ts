import type { PortalLesson } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { clockParts, countdownParts, lessonClock } from './countdown';

const lesson = (over: Partial<PortalLesson> = {}): PortalLesson => ({
  id: 'l1', starts_at: '2026-10-27T16:00:00.000Z', ends_at: '2026-10-27T16:30:00.000Z',
  status: 'confirmed', teacher: { display_name_ar: 'أبرار', display_name_en: null },
  way_in: 'classroom', meeting_url: null,
  window: { state: 'open', opens_at: '2026-10-27T15:50:00.000Z', closes_at: '2026-10-27T16:45:00.000Z' },
  ...over,
});
const at = (iso: string) => new Date(iso);

describe('countdownParts', () => {
  it('splits what is left into days, hours, minutes and seconds', () => {
    expect(countdownParts('2026-10-29T18:05:09Z', at('2026-10-27T16:00:00Z'))).toEqual({
      days: 2, hours: 2, minutes: 5, seconds: 9,
    });
  });

  it('is null once the target is reached (or the date is unreadable)', () => {
    expect(countdownParts('2026-10-27T16:00:00Z', at('2026-10-27T16:00:00Z'))).toBeNull();
    expect(countdownParts('later', at('2026-10-27T16:00:00Z'))).toBeNull();
  });

  it('writes hh:mm:ss with two digits each', () => {
    expect(clockParts({ days: 0, hours: 1, minutes: 2, seconds: 3 })).toBe('01:02:03');
  });
});

describe('lessonClock', () => {
  it('counts to the window before it opens, then to the start', () => {
    expect(lessonClock(lesson(), at('2026-10-27T15:00:00Z'))).toEqual({
      kind: 'opensIn', parts: { days: 0, hours: 0, minutes: 50, seconds: 0 },
    });
    expect(lessonClock(lesson(), at('2026-10-27T15:55:00Z'))).toEqual({
      kind: 'startsIn', parts: { days: 0, hours: 0, minutes: 5, seconds: 0 },
    });
  });

  it('says «الآن» while it runs; nothing once over or cancelled', () => {
    expect(lessonClock(lesson(), at('2026-10-27T16:10:00Z'))).toEqual({ kind: 'now' });
    expect(lessonClock(lesson(), at('2026-10-27T17:00:00Z'))).toBeNull();
    expect(lessonClock(lesson({ status: 'cancelled_by_admin' }), at('2026-10-27T15:00:00Z'))).toBeNull();
  });

  it('after the end but inside the window: no clock', () => {
    expect(lessonClock(lesson(), at('2026-10-27T16:40:00Z'))).toBeNull();
  });
});
