import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { emptyGrid } from './grid';
import { barBox, overlaps, trackPct, wallClock, weeklyHours, weeklyHoursLabel } from './track';

const r = (start: string, end: string) => ({ start, end });

describe('availability track geometry (R-TCH-02, docs/07 §8)', () => {
  it('maps 08:00–24:00 onto 0–100% and clamps outside it', () => {
    expect(trackPct(8 * 60)).toBe(0);
    expect(trackPct(16 * 60)).toBe(50);
    expect(trackPct(6 * 60)).toBe(0);
    expect(trackPct(23 * 60 + 59)).toBeCloseTo(99.9, 1);
  });

  it('turns a range into an offset + width and drops ranges before 08:00', () => {
    expect(barBox(r('15:00', '18:00'))).toEqual({ start: 43.75, width: 18.75 });
    expect(barBox(r('07:00', '09:00'))).toEqual({ start: 0, width: 6.25 });
    expect(barBox(r('05:00', '07:30'))).toBeNull();
  });

  it('finds the overlapping span, including one hidden behind a long range', () => {
    expect(overlaps([r('15:00', '18:00'), r('17:30', '20:00')])).toEqual([r('17:30', '18:00')]);
    expect(overlaps([r('10:00', '22:00'), r('12:00', '13:00'), r('18:00', '19:00')])).toEqual([
      r('12:00', '13:00'),
      r('18:00', '19:00'),
    ]);
    expect(overlaps([r('10:00', '12:00'), r('12:00', '13:00')])).toEqual([]);
  });
});

describe('weekly hours summary', () => {
  it('sums the week and counts overlaps once', () => {
    const grid = { ...emptyGrid(), 6: [r('15:00', '18:00'), r('17:00', '19:00')], 4: [r('10:00', '13:30')] };
    expect(weeklyHours(grid)).toBe(7.5);
    expect(weeklyHours(emptyGrid())).toBe(0);
  });

  it('agrees the Arabic noun with the number', () => {
    const forms = t.availability.weeklyHours;
    expect(weeklyHoursLabel(0)).toBe('');
    expect(weeklyHoursLabel(1)).toBe(forms.one);
    expect(weeklyHoursLabel(2)).toBe(forms.two);
    expect(weeklyHoursLabel(5)).toBe(forms.few.replace('{n}', '5'));
    expect(weeklyHoursLabel(27)).toBe(forms.other.replace('{n}', '27'));
    expect(weeklyHoursLabel(7.5)).toBe(forms.other.replace('{n}', '7.5'));
  });
});

describe('wall clock in the grid tz (today row + now-marker)', () => {
  it('reads weekday and minute in the given zone', () => {
    // 2026-10-01 is a Thursday; 12:20 UTC = 15:20 in Riyadh (UTC+3, no DST).
    const now = new Date('2026-10-01T12:20:00Z');
    expect(wallClock(now, 'Asia/Riyadh')).toEqual({ weekday: 4, minute: 15 * 60 + 20 });
    expect(wallClock(new Date('2026-10-01T22:30:00Z'), 'Asia/Riyadh')).toEqual({ weekday: 5, minute: 90 });
  });
});
