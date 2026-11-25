import { describe, expect, it } from 'vitest';
import { dayTile, dayWord, lessonMinutes } from './day-word';

describe('dayWord', () => {
  const now = new Date('2026-11-15T20:30:00.000Z');
  it('today and tomorrow on the given calendar, else null', () => {
    expect(dayWord(new Date('2026-11-15T21:00:00.000Z'), now, 'UTC')).toBe('today');
    // 23:30 in Riyadh: the lesson at 00:30 there is tomorrow.
    expect(dayWord(new Date('2026-11-15T21:30:00.000Z'), now, 'Asia/Riyadh')).toBe('tomorrow');
    expect(dayWord(new Date('2026-11-18T10:00:00.000Z'), now, 'UTC')).toBeNull();
    expect(dayWord(new Date('2026-11-14T10:00:00.000Z'), now, 'UTC')).toBeNull();
  });

  it('minutes of a lesson', () => {
    expect(lessonMinutes({ starts_at: '2026-11-15T15:30:00Z', ends_at: '2026-11-15T16:15:00Z' })).toBe(45);
  });
});

describe('dayTile', () => {
  const at = new Date('2026-11-16T12:00:00.000Z');
  const en = { tz: 'UTC', locale: 'en' } as const;
  it('the weekday over the day number, long or short', () => {
    expect(dayTile(at, en)).toEqual({ weekday: 'Monday', day: '16' });
    expect(dayTile(at, en, 'short')).toEqual({ weekday: 'Mon', day: '16' });
    expect(dayTile(at, { tz: 'UTC', locale: 'ar' }).day).toBe('16');
  });

  it('reads the day on the given zone', () => {
    const late = new Date('2026-11-16T22:30:00.000Z');
    expect(dayTile(late, { tz: 'Asia/Riyadh', locale: 'en' }).day).toBe('17');
  });
});
