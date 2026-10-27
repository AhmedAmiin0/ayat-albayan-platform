// students + guardians modules on invented rows.
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, reportRow, row, studentRow } from '../../sources/sheets/fixtures.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { guardiansModule } from './guardians.ts';
import { studentsModule } from './students.ts';

const MODULES = [teachersModule, guardiansModule, studentsModule];

describe('students', () => {
  it('maps registry fields, keeps the legacy code and links guardian + teacher', () => {
    const run = pipeline(
      bundleOf({
        hub_students: [
          studentRow({ legacy_code: 'AB-0012', age: 9, status: 'طالب حالي', level: 'مبتدئ' }),
        ],
      }),
      MODULES,
    );
    const [s] = run.by('students');
    expect(s?.key).toEqual(keys.student({ guardianPhone: '+966551110001', name: 'ليان' }));
    expect(s?.record.columns).toMatchObject({
      name: 'ليان',
      name_normalized: 'ليان',
      age: 9,
      gender: 'female',
      status: 'new', // «طالب حالي» alone is no subscription (docs/06 «Student status»)
      level: 'مبتدئ',
      tz: 'Asia/Riyadh',
      code_seq: 12,
    });
    expect(s?.record.refs).toEqual({
      guardian_id: keys.guardian('+966551110001'),
      teacher_id: keys.teacher('abrar'),
    });
  });

  it('nulls out-of-range ages and unknown genders with a warning', () => {
    const run = pipeline(
      bundleOf({ hub_students: [studentRow({ age: 120, gender: 'x' })] }),
      MODULES,
    );
    expect(run.by('students')[0]?.record.columns).toMatchObject({ age: null, gender: null });
    expect(run.issues.map((i) => i.field)).toEqual(['age', 'gender']);
  });

  it('a paid HEART period covering the import date is active; no code without a legacy one', () => {
    const run = pipeline(
      bundleOf({
        hub_students: [studentRow({})],
        heart_subscriptions: [
          row({ name: 'Layan', phone: 966551110001, date: '2026-09-20', paid_status: 'Paid' }),
        ],
      }),
      MODULES,
    );
    const cols = run.by('students')[0]?.record.columns;
    expect(cols?.['status']).toBe('active');
    expect(cols).not.toHaveProperty('code_seq');
  });

  it('takes the teacher of the reports when the registry has none (A3)', () => {
    const run = pipeline(
      bundleOf({
        hub_students: [studentRow({ teacher: null })],
        hub_reports: [reportRow({ teacher_slug: 'hend' })],
      }),
      MODULES,
    );
    expect(run.by('students')[0]?.record.refs['teacher_id']).toEqual(keys.teacher('hend'));
  });

  it('emits legacy-code students first, so new codes never take an AB code', () => {
    const run = pipeline(
      bundleOf({
        hub_students: [
          studentRow({ student_name: 'دانة' }),
          studentRow({ student_name: 'سلمى', legacy_code: 'AB-0185' }),
        ],
      }),
      MODULES,
    );
    expect(run.by('students').map((d) => d.record.columns['code_seq'])).toEqual([185, undefined]);
  });
});

describe('guardians', () => {
  it('one guardian per phone, named by the guardian or the first child', () => {
    const run = pipeline(
      bundleOf({
        hub_students: [
          studentRow({ student_name: 'ريم وجنى', source: 'إعلان فيسبوك,' }),
          studentRow({
            student_name: 'دانة',
            phone: '201011110001',
            guardian_name: 'أم دانة',
            country: 'مصر',
          }),
        ],
      }),
      MODULES,
    );
    expect(run.by('guardians').map((g) => g.record.columns)).toEqual([
      {
        name: 'ريم',
        phone_e164: '+966551110001',
        country: null,
        tz: 'Asia/Riyadh',
        source: 'facebook_ad',
      },
      {
        name: 'أم دانة',
        phone_e164: '+201011110001',
        country: 'مصر',
        tz: 'Africa/Cairo',
        source: null,
      },
    ]);
    expect(run.by('students')).toHaveLength(3);
    expect(guardiansModule.adoptBy).toBe('phone_e164');
  });
});
