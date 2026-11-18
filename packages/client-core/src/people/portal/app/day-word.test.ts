import { describe, expect, it } from 'vitest';
import { dayWord, dayWordOf, lessonMinutes } from './day-word.js';

describe('dayWord', () => {
  const now = new Date('2026-11-15T20:30:00.000Z');
  it('today and tomorrow on the given calendar, else null', () => {
    expect(dayWord(new Date('2026-11-15T21:00:00.000Z'), now, 'UTC')).toBe('today');
    // 23:30 in Riyadh: the lesson at 00:30 there is tomorrow.
    expect(dayWord(new Date('2026-11-15T21:30:00.000Z'), now, 'Asia/Riyadh')).toBe('tomorrow');
    expect(dayWord(new Date('2026-11-18T10:00:00.000Z'), now, 'UTC')).toBeNull();
    expect(dayWord(new Date('2026-11-14T10:00:00.000Z'), now, 'UTC')).toBeNull();
  });

  it('of a «YYYY-MM-DD» day against today\'s', () => {
    expect(dayWordOf('2026-11-15', '2026-11-15')).toBe('today');
    expect(dayWordOf('2026-11-16', '2026-11-15')).toBe('tomorrow');
    expect(dayWordOf('2026-11-17', '2026-11-15')).toBeNull();
    expect(dayWordOf('2026-11-14', '2026-11-15')).toBeNull();
  });

  it('minutes of a lesson', () => {
    expect(lessonMinutes({ starts_at: '2026-11-15T15:30:00Z', ends_at: '2026-11-15T16:15:00Z' })).toBe(45);
  });
});
