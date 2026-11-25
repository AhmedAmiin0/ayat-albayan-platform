import { describe, expect, it } from 'vitest';
import type { PortalLesson } from '@ab/shared';
import { isLessonNow, lessonWait, nextLesson, windowStateAt } from './lesson-window';

const w = { opens_at: '2026-10-05T15:45:00.000Z', closes_at: '2026-10-05T19:00:00.000Z' };
const at = (iso: string) => new Date(iso);

describe('windowStateAt', () => {
  it('is early, open (edges included) and closed by the page clock', () => {
    expect(windowStateAt(w, at('2026-10-05T15:44:59Z'))).toBe('early');
    expect(windowStateAt(w, at('2026-10-05T15:45:00Z'))).toBe('open');
    expect(windowStateAt(w, at('2026-10-05T19:00:00Z'))).toBe('open');
    expect(windowStateAt(w, at('2026-10-05T19:00:01Z'))).toBe('closed');
  });
});

describe('isLessonNow', () => {
  const l = { starts_at: '2026-10-05T16:00:00.000Z', ends_at: '2026-10-05T17:00:00.000Z' };
  it('is true from the start until the end', () => {
    expect(isLessonNow(l, at('2026-10-05T15:59:59Z'))).toBe(false);
    expect(isLessonNow(l, at('2026-10-05T16:00:00Z'))).toBe(true);
    expect(isLessonNow(l, at('2026-10-05T17:00:00Z'))).toBe(false);
  });
});


const lesson = (over: Partial<PortalLesson> = {}): PortalLesson => ({
  id: 'l1', starts_at: '2026-10-27T16:00:00.000Z', ends_at: '2026-10-27T16:30:00.000Z',
  status: 'confirmed', teacher: { display_name_ar: 'أبرار', display_name_en: null },
  way_in: 'classroom', meeting_url: null,
  window: { state: 'open', opens_at: '2026-10-27T15:50:00.000Z', closes_at: '2026-10-27T16:45:00.000Z' },
  ...over,
});
const OPEN = at('2026-10-27T15:55:00Z');

describe('lessonWait (the card\'s reason for no «ادخل الحلقة»)', () => {
  it('cancelled first, then over, then no way in, then not open yet', () => {
    expect(lessonWait(lesson({ status: 'cancelled_by_teacher', way_in: 'none' }), OPEN)).toBe('cancelled');
    expect(lessonWait(lesson({ status: 'completed' }), OPEN)).toBe('closed');
    expect(lessonWait(lesson(), at('2026-10-27T17:00:00Z'))).toBe('closed');
    expect(lessonWait(lesson({ way_in: 'none' }), OPEN)).toBe('noWayIn');
    expect(lessonWait(lesson(), at('2026-10-27T15:00:00Z'))).toBe('opensAt');
  });

  it('an external lesson without its link yet waits; with it (or our room) it joins', () => {
    expect(lessonWait(lesson({ way_in: 'external' }), OPEN)).toBe('noWayIn');
    expect(lessonWait(lesson({ way_in: 'external', meeting_url: 'https://meet.example.org/x' }), OPEN)).toBeNull();
    expect(lessonWait(lesson(), OPEN)).toBeNull();
  });
});

describe('nextLesson', () => {
  it('skips cancelled and finished lessons; null when none is ahead', () => {
    const later = lesson({ id: 'l2', window: { state: 'early', opens_at: '2026-10-28T15:50:00.000Z', closes_at: '2026-10-28T16:45:00.000Z' } });
    const gone = lesson({ id: 'l0', status: 'cancelled_by_admin' });
    expect(nextLesson([gone, lesson(), later], OPEN)?.id).toBe('l1');
    expect(nextLesson([gone, lesson(), later], at('2026-10-27T17:00:00Z'))?.id).toBe('l2');
    expect(nextLesson([gone], OPEN)).toBeNull();
  });
});
