// schedule_rules + links from invented «تقويم الحجوزات» rows (B1, A4, gotcha 7).
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, row, studentRow } from '../../sources/sheets/fixtures.ts';
import type { Cell } from '../../types.ts';
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
const booking = (fields: Record<string, Cell>) =>
  row({
    name: 'ليان',
    phone: '966551110001',
    date: '2026-08-20',
    start_time: '9:30',
    duration_min: 45,
    recurrence: 'أسبوعي: الاتنين,الخميس',
    status: 'مشترك',
    package_text: '8 حلقات في الشهر',
    teacher: null,
    ...fields,
  });
const run = (bookings: ReturnType<typeof booking>[], students = [studentRow({})]) =>
  pipeline(bundleOf({ hub_students: students, book_bookings: bookings }), MODULES);
const LAYAN = keys.student({ guardianPhone: '+966551110001', name: 'ليان' });

describe('schedule rules', () => {
  it('a subscribed weekly booking becomes a rule with the student’s teacher', () => {
    const r = run([booking({})]);
    const [rule] = r.by('schedule_rules');
    expect(rule?.key).toEqual(keys.scheduleRule({ teacher: 'abrar', students: [LAYAN.key] }));
    expect(rule?.record).toEqual({
      columns: {
        duration_min: 45,
        start_time_local: '09:30',
        tz: 'Asia/Riyadh',
        byday: [1, 4],
        starts_on: '2026-10-02', // the booking's date (2026-08-20) clamped to --from (today)
        ends_on: null,
        status: 'active',
        package: '8',
      },
      refs: { teacher_id: keys.teacher('abrar') },
    });
    expect(r.by('schedule_rule_students').map((d) => d.record.refs)).toEqual([
      { rule_id: rule?.key, student_id: LAYAN },
    ]);
  });

  it('skips one-off rows, unsynced statuses and series that ended before --from', () => {
    const r = run([
      booking({ recurrence: null, package_text: 'حلقة تجريبية مجانية' }),
      booking({ status: 'مبدئي' }),
      booking({ status: 'ملغي' }),
      booking({ status: 'مؤكد', recurrence: 'أسبوعي: السبت حتى 2026-09-01', teacher: 'Hend' }),
      booking({ status: 'مؤكد', recurrence: 'أسبوعي: السبت حتى 2026-12-01', teacher: 'Hend' }),
    ]);
    expect(
      r
        .by('schedule_rules')
        .map((d) => [
          d.record.columns['status'],
          d.record.columns['ends_on'],
          d.record.refs['teacher_id']?.key,
        ]),
    ).toEqual([['active', '2026-12-01', 'hend']]);
  });

  it('one row naming two children makes one group rule (A4)', () => {
    const r = run(
      [booking({ name: 'ريم وجنى', start_time: '17:00' })],
      [studentRow({ student_name: 'ريم وجنى' })],
    );
    expect(r.by('schedule_rule_students')).toHaveLength(2);
    expect(r.by('schedule_rules')[0]?.key.key).toContain('+');
  });

  it('B1: the latest row of a teacher + student set wins, the older goes to review', () => {
    const r = run([booking({ start_time: '08:00' }), booking({ start_time: '10:00' })]);
    expect(r.by('schedule_rules')[0]?.record.columns['start_time_local']).toBe('10:00');
    expect(r.issues).toMatchObject([
      { code: 'conflict', severity: 'review', entity: 'schedule_rules' },
    ]);
    expect(r.by('schedule_rule_students')).toHaveLength(1);
  });

  it('rejects rows it cannot place', () => {
    const r = run(
      [
        booking({ recurrence: 'كل يوم' }),
        booking({ start_time: 'الساعة 7' }),
        booking({ name: 'Lorem ipsum' }),
        booking({ name: null }),
        booking({ phone: '@SomeHandle1' }),
        booking({ teacher: 'الفيوم' }),
        booking({ recurrence: 'أسبوعي: السبت حتى 2026-08-01' }),
      ],
      [studentRow({ teacher: null })],
    );
    expect(r.by('schedule_rules')).toEqual([]);
    const own = r.issues.filter((i) => i.entity === 'schedule_rules');
    expect(own.map((i) => [i.code, i.field])).toEqual([
      ['unmapped_value', 'recurrence'],
      ['missing_field', 'date,start_time,duration_min'],
      ['test_row', undefined],
      ['missing_field', 'name'],
      ['bad_phone', 'phone'],
      ['unknown_teacher', 'teacher'],
      ['bad_date', 'recurrence'],
    ]);
  });

  it('a rule without any teacher is rejected; unknown package text is a warning', () => {
    const r = run([booking({ package_text: 'نظام جماعي' })], [studentRow({ teacher: null })]);
    expect(r.issues.filter((i) => i.severity === 'reject')).toMatchObject([
      { code: 'missing_field', field: 'teacher' },
    ]);
    const w = run([booking({ package_text: 'نظام جماعي' })]);
    expect(w.by('schedule_rules')[0]?.record.columns['package']).toBeNull();
    expect(w.issues).toMatchObject([
      { code: 'unmapped_value', severity: 'warn', field: 'package_text' },
    ]);
  });
});
