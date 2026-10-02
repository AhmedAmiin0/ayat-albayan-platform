// HEART weekly timetables → schedule rules, on invented customers and times.
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, row, studentRow } from '../../sources/sheets/fixtures.ts';
import type { Cell, SourceRow } from '../../types.ts';
import { guardiansModule } from '../people/guardians.ts';
import { studentsModule } from '../people/students.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { scheduleRuleStudentsModule, scheduleRulesModule } from './rules.ts';

const MODULES = [
  teachersModule,
  guardiansModule,
  studentsModule,
  scheduleRulesModule,
  scheduleRuleStudentsModule,
];
const sub = row(
  { name: 'Layan', phone: 966551110001, date: '2026-09-01', lessons_used: 2, lessons_remaining: 6 },
  { source: 'HEART', tab: 'subscription' },
);
const slotRow = (f: Record<string, Cell>) =>
  row({ name: 'Layan', ...f }, { source: 'HEART', tab: 'ABRAR' });
const run = (o: { timetable: SourceRow[]; bookings?: SourceRow[] }) =>
  pipeline(
    bundleOf({
      hub_students: [studentRow({ teacher: 'hend' })],
      heart_subscriptions: [sub],
      heart_abrar: o.timetable,
      book_bookings: o.bookings ?? [],
    }),
    MODULES,
  );
const LAYAN = keys.student({ guardianPhone: '+966551110001', name: 'ليان' });

describe('HEART timetable rules', () => {
  it('a row with one time becomes one rule: tab teacher, day columns, subscription start', () => {
    const r = run({ timetable: [slotRow({ sun: '17:00', wed: '17:00' })] });
    const [rule] = r.by('schedule_rules');
    expect(rule?.key).toEqual(keys.scheduleRule({ teacher: 'abrar', students: [LAYAN.key] }));
    expect(rule?.record.columns).toMatchObject({
      start_time_local: '17:00',
      byday: [0, 3],
      starts_on: '2026-09-01',
      duration_min: 45,
      tz: 'Asia/Riyadh',
      package: '8',
      status: 'active',
    });
    expect(r.by('schedule_rule_students').map((d) => d.record.refs['student_id'])).toEqual([LAYAN]);
  });

  it('days with different times become one rule per time', () => {
    const r = run({ timetable: [slotRow({ sun: '15:00', wed: '16:00' })] });
    expect(
      r.by('schedule_rules').map((d) => [d.key.key.slice(-6), d.record.columns['byday']]),
    ).toEqual([
      ['@15:00', [0]],
      ['@16:00', [3]],
    ]);
    expect(r.by('schedule_rule_students')).toHaveLength(2);
  });

  it('rows without times are skipped; an unknown customer goes to review', () => {
    const r = run({ timetable: [slotRow({}), slotRow({ name: 'Nobody', sat: '10:00' })] });
    expect(r.by('schedule_rules')).toEqual([]);
    expect(r.issues.filter((i) => i.entity === 'schedule_rules')).toMatchObject([
      { code: 'missing_ref', severity: 'review' },
    ]);
  });
});
