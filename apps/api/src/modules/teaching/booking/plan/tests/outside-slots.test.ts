import { describe, expect, it } from 'vitest';
import { outsideGrid, type OutsideGridInput } from '@/modules/teaching/booking/plan/outside-slots';

// Tue 2026-12-01 08:00Z: Cairo is UTC+2 (winter), Riyadh UTC+3, so the family's noon is 09:00Z
// = 11:00 at the teacher's, before her Sun + Tue 16:00–22:00 Cairo hours (14:00–20:00Z).
const NOW = new Date('2026-12-01T08:00:00Z');
const TO = new Date('2026-12-15T08:00:00Z');
const HOURS = [0, 2].map((weekday) => ({
  weekday,
  start_time: '16:00',
  end_time: '22:00',
  tz: 'Africa/Cairo',
}));
type Rows = OutsideGridInput['rows'];
const NO_CLASH: Rows = { availability: HOURS, timeOff: [], teacherLessons: [], studentLessons: [] };
const at = (iso: string) => new Date(iso);
const grid = (rows = NO_CLASH) =>
  outsideGrid({ from: NOW, to: TO, durationMin: 45, stepMin: 30, teacherTz: 'Africa/Cairo', rows });
const starts = (rows = NO_CLASH) => grid(rows).map((s) => s.starts_at);

describe('outsideGrid («وقت آخر», owner 2026-11-21)', () => {
  it('steps every 30 min of the teacher day from the server now to 14 days on, nothing past', () => {
    const slots = grid();
    expect(slots[0]?.starts_at).toBe('2026-12-01T08:00:00.000Z');
    expect(slots.at(-1)?.ends_at).toBe('2026-12-15T07:45:00.000Z');
    expect(slots.every((s) => Date.parse(s.starts_at) >= NOW.getTime())).toBe(true);
    expect(slots.every((s) => Date.parse(s.ends_at) <= TO.getTime())).toBe(true);
    expect(slots).toHaveLength(14 * 48 - 1);
  });

  it('marks the family noon (Riyadh) outside the Cairo teacher hours and 16:00 Cairo inside', () => {
    const byStart = new Map(grid().map((s) => [s.starts_at, s.inside_hours]));
    expect(byStart.get('2026-12-01T09:00:00.000Z')).toBe(false);
    expect(byStart.get('2026-12-01T14:00:00.000Z')).toBe(true);
    expect(byStart.get('2026-12-01T19:00:00.000Z')).toBe(true);
    expect(byStart.get('2026-12-01T19:30:00.000Z')).toBe(false);
    expect(byStart.get('2026-12-02T14:00:00.000Z')).toBe(false);
  });

  it('leaves out starts that clash with the teacher lessons, time off or the student lessons', () => {
    const rows = {
      ...NO_CLASH,
      teacherLessons: [
        { id: 'T1', starts_at: at('2026-12-01T09:00:00Z'), ends_at: at('2026-12-01T09:45:00Z') },
      ],
      studentLessons: [
        {
          id: 'S1',
          student_id: 's',
          starts_at: at('2026-12-01T12:00:00Z'),
          ends_at: at('2026-12-01T12:30:00Z'),
        },
      ],
      timeOff: [{ start: at('2026-12-01T15:00:00Z'), end: at('2026-12-01T16:00:00Z') }],
    };
    const left = new Set(starts(rows));
    const gone = ['08:30', '09:00', '09:30', '11:30', '12:00', '14:30', '15:00', '15:30'];
    for (const hm of gone) expect(left.has(`2026-12-01T${hm}:00.000Z`)).toBe(false);
    for (const hm of ['08:00', '10:00', '11:00', '12:30', '14:00', '16:00']) {
      expect(left.has(`2026-12-01T${hm}:00.000Z`)).toBe(true);
    }
  });

  it('is empty when the window has no room for one lesson', () => {
    const tight = {
      from: NOW,
      to: new Date('2026-12-01T08:30:00Z'),
      durationMin: 45,
      stepMin: 30,
      teacherTz: 'Africa/Cairo',
      rows: NO_CLASH,
    };
    expect(outsideGrid(tight)).toEqual([]);
  });
});
