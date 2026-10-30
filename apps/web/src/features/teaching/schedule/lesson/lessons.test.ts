import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ABRAR, FATMA, JOUD, lesson, SUHAILA } from './lesson-fixture';
import {
  durationMin,
  filterLessons,
  isClosedLesson,
  lessonsOnDay,
  needsConfirmCount,
  studentNames,
  studentTimes,
  teacherRows,
  timeInCity,
} from './lessons';
import { RIYADH_TZ } from '@ab/shared';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

const A = lesson({ id: 'a', status: 'scheduled' });
const B = lesson({ id: 'b', status: 'confirmed', teacher: FATMA, starts_at: '2026-10-05T10:00:00.000Z' });
const MOVED = lesson({ id: 'c', status: 'rescheduled' });
const CANCELLED = lesson({ id: 'd', status: 'cancelled_by_teacher' });

describe('filterLessons (docs/10 §5.1)', () => {
  it('hides moved, cancelled and excused rows by default', () => {
    expect(filterLessons([A, B, MOVED, CANCELLED], {}).map((l) => l.id)).toEqual(['a', 'b']);
    expect(isClosedLesson('excused')).toBe(true);
    expect(isClosedLesson('no_show')).toBe(false);
  });

  it('shows them with «إظهار الملغية…» on', () => {
    expect(filterLessons([A, MOVED, CANCELLED], { showClosed: true })).toHaveLength(3);
  });

  it('a status filter wins, closed statuses included', () => {
    expect(filterLessons([A, B, MOVED], { status: 'rescheduled' }).map((l) => l.id)).toEqual(['c']);
  });

  it('a program filter keeps only the teachers who teach it', () => {
    expect(filterLessons([A, B], { teacherIds: new Set([FATMA.id]) }).map((l) => l.id)).toEqual(['b']);
  });
});

describe('teacherRows (R-SCH-01 week grid)', () => {
  it('one row per teacher by Arabic name, lessons in their Riyadh day', () => {
    const late = lesson({ id: 'late', starts_at: '2026-10-03T22:30:00.000Z' }); // 01:30 Sunday in Riyadh
    const rows = teacherRows([B, A, late]);
    expect(rows.map((r) => r.teacher.id)).toEqual([ABRAR.id, FATMA.id]);
    expect(rows[0]?.days.get('2026-10-04')?.map((l) => l.id)).toEqual(['late', 'a']);
    expect(rows[1]?.days.get('2026-10-05')?.map((l) => l.id)).toEqual(['b']);
  });
});

describe('lessonsOnDay', () => {
  it('buckets by the local day of the given zone', () => {
    const early = lesson({ id: 'early', starts_at: '2026-10-03T21:30:00.000Z' });
    expect(lessonsOnDay([A, early], { date: '2026-10-04', tz: RIYADH_TZ }).map((l) => l.id)).toEqual(['early', 'a']);
    expect(lessonsOnDay([A, early], { date: '2026-10-03', tz: 'America/New_York' }).map((l) => l.id)).toEqual(['early']);
  });
});

describe('times with their zone (R-SCH-01)', () => {
  it('timeInCity names the city', () => {
    const want = t.schedule.inCity.replace('{time}', '17:00').replace('{city}', t.tz['Asia/Riyadh']);
    expect(timeInCity('2026-10-04T14:00:00.000Z', RIYADH_TZ, C24)).toBe(want);
    expect(timeInCity('2026-10-04T14:00:00.000Z', 'Pacific/Fiji', C24)).toContain('Pacific/Fiji');
  });

  it('studentTimes lists each other zone once (Cairo in winter, UTC+2)', () => {
    const students = [SUHAILA, { ...SUHAILA, id: 's-9' }, JOUD];
    const group = lesson({ starts_at: '2026-12-06T14:00:00.000Z', students });
    const cairo = t.schedule.studentTime.replace('{time}', timeInCity(group.starts_at, 'Africa/Cairo', C24));
    expect(studentTimes(group, RIYADH_TZ, C24)).toEqual([cairo]);
    expect(studentTimes(lesson({ students: [JOUD] }), RIYADH_TZ, C24)).toEqual([]);
  });

  it('studentTimes skips a zone on the same clock at that instant (Cairo summer time)', () => {
    expect(studentTimes(lesson({ students: [SUHAILA] }), RIYADH_TZ, C24)).toEqual([]);
  });
});

describe('small helpers', () => {
  it('studentNames joins a group with و', () => {
    expect(studentNames(lesson({ students: [SUHAILA, JOUD] }))).toBe('سهيلة وجود');
  });

  it('needsConfirmCount counts scheduled lessons only', () => {
    expect(needsConfirmCount([A, B, MOVED])).toBe(1);
  });

  it('durationMin reads the lesson length', () => {
    expect(durationMin(lesson({ minutes: 60 }))).toBe(60);
  });
});
