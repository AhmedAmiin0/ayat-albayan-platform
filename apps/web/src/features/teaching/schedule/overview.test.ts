import { describe, expect, it } from 'vitest';
import { FATMA, lesson } from './lesson/lesson-fixture';
import {
  boardRows,
  clipSpans,
  dayWindow,
  filterTeachers,
  freeText,
  hoursText,
  spanRange,
  teacherDay,
} from './overview';
import { T_ABRAR, T_FATMA, T_NOUR } from './overview-fixture';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

const SUNDAY = '2026-10-04';
const BEFORE = new Date('2026-10-03T09:00:00.000Z'); // Saturday, the whole week ahead
const LESSON = lesson({ id: 'a' }); // Sunday 17:00–17:45 Riyadh

describe('filterTeachers (program, gender, picked ids)', () => {
  const all = [T_ABRAR, T_FATMA, T_NOUR];
  const names = (f: Parameters<typeof filterTeachers>[1]) => filterTeachers(all, f).map((x) => x.display_name_ar);

  it('keeps everyone with no filter and an empty pick', () => {
    expect(names({})).toHaveLength(3);
    expect(names({ ids: [] })).toHaveLength(3);
  });

  it('filters by program, gender and ids together', () => {
    expect(names({ program: 'arabic' })).toEqual([FATMA.display_name_ar, 'نور']);
    expect(names({ gender: 'male' })).toEqual(['نور']);
    expect(names({ program: 'arabic', gender: 'female' })).toEqual([FATMA.display_name_ar]);
    expect(names({ ids: ['t-abrar', 't-nour'] })).toEqual(['أبرار', 'نور']);
  });
});

describe('boardRows', () => {
  it('gives every teacher a row, lessons bucketed by Riyadh day', () => {
    const rows = boardRows([T_ABRAR, T_NOUR], [LESSON]);
    expect(rows.map((r) => r.teacher.id)).toEqual(['t-abrar', 't-nour']);
    expect(rows[0]?.days.get(SUNDAY)?.map((l) => l.id)).toEqual(['a']);
    expect(rows[1]?.days.size).toBe(0);
  });

  it("takes the teacher's photo from the overview, lessons or not", () => {
    const shot = lesson({ id: 'p', teacher: { ...LESSON.teacher, id: 't-nour', avatar_url: 'https://x.test/old.png' } });
    const abrar = { ...T_ABRAR, avatar_url: 'https://x.test/a.png' };
    expect(boardRows([abrar, T_NOUR], [shot]).map((r) => r.photo)).toEqual(['https://x.test/a.png', null]);
  });
});

describe('Riyadh-day spans', () => {
  it('cuts a span crossing midnight into each day, the first ending at 24:00', () => {
    const late = { starts_at: '2026-10-04T19:00:00.000Z', ends_at: '2026-10-04T23:00:00.000Z' }; // 22:00 → 02:00
    expect(clipSpans([late], SUNDAY).map((s) => spanRange(s, SUNDAY))).toEqual([{ start: '22:00', end: '24:00' }]);
    expect(clipSpans([late], '2026-10-05').map((s) => spanRange(s, '2026-10-05'))).toEqual([{ start: '00:00', end: '02:00' }]);
    expect(clipSpans([late], '2026-10-06')).toEqual([]);
  });

  it('the day window is Riyadh midnight to midnight in UTC', () => {
    expect(dayWindow(SUNDAY)).toEqual({ from: new Date('2026-10-03T21:00:00.000Z'), to: new Date('2026-10-04T21:00:00.000Z') });
  });

  it('words the free total and a gap', () => {
    expect(hoursText(210)).toBe('3:30');
    expect(hoursText(45)).toBe('0:45');
    expect(freeText({ start: '17:00', end: '19:00' }, C24)).toBe('متاح 17:00 – 19:00');
  });
});

describe('teacherDay', () => {
  it('draws the windows, ticks the lesson and sums the free gaps', () => {
    const day = teacherDay(T_ABRAR, { day: SUNDAY, lessons: [LESSON], now: BEFORE });
    expect(day.windows).toEqual([{ start: '16:00', end: '20:00' }]);
    expect(day.ticks).toEqual([{ start: '17:00', end: '17:45' }]);
    expect(day.gaps.map((g) => spanRange(g, SUNDAY))).toEqual([
      { start: '16:00', end: '17:00' },
      { start: '17:45', end: '20:00' },
    ]);
    expect(day.freeMin).toBe(195);
    expect(day.dayOff).toBeNull();
  });

  it('keeps only what is left from now on, from the next quarter hour, 30 min or more', () => {
    const at1820 = new Date('2026-10-04T15:20:00.000Z'); // 18:20 Riyadh → from 18:30
    const day = teacherDay(T_ABRAR, { day: SUNDAY, lessons: [], now: at1820 });
    expect(day.gaps.map((g) => spanRange(g, SUNDAY))).toEqual([{ start: '18:30', end: '20:00' }]);
    const at1935 = new Date('2026-10-04T16:35:00.000Z'); // 19:35 → from 19:45, 15 min left: dropped
    expect(teacherDay(T_ABRAR, { day: SUNDAY, lessons: [], now: at1935 }).gaps).toEqual([]);
  });

  it('a time off over the whole track is the day off; a part of it is only hatched', () => {
    const monday = teacherDay(T_FATMA, { day: '2026-10-05', lessons: [], now: BEFORE });
    expect(monday.dayOff?.reason).toBe('سفر');
    expect(monday.off).toEqual([{ start: '00:00', end: '24:00' }]);
    const afternoon = { id: 'o2', reason: null, starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T15:00:00.000Z' };
    const sunday = teacherDay({ ...T_ABRAR, time_off: [afternoon] }, { day: SUNDAY, lessons: [], now: BEFORE });
    expect(sunday.dayOff).toBeNull();
    expect(sunday.off).toEqual([{ start: '16:00', end: '18:00' }]);
  });
});
