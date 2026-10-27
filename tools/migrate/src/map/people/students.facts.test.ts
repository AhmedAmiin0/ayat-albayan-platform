// What SUBS, ATT and the reports change on a student (invented rows): status, teacher, reviews.
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, reportRow, row, studentRow } from '../../sources/sheets/fixtures.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { guardiansModule } from './guardians.ts';
import { studentsModule } from './students.ts';

const MODULES = [teachersModule, guardiansModule, studentsModule];
const subs = (fields: Record<string, string | number | null>) =>
  row({ teacher: 'المعلمة: هند', ...fields }, { source: 'SUBS', tab: 'الطلاب' });
function att(folder: string) {
  const r = row({ teacher: 'هند' }, { source: 'ATT', tab: 'الحضور' });
  return { ...r, ref: { ...r.ref, file: `تقارير آيات البيان/${folder}/سجل حضور.xlsx` } };
}

describe('students: SUBS register', () => {
  it('SUBS lessons alone are no subscription: new, the downgrade reported', () => {
    const run = pipeline(
      bundleOf({
        hub_students: [studentRow({ teacher: 'hend' })],
        subs_students: [subs({ student_name: 'ليان', lessons_count: 3 })],
      }),
      MODULES,
    );
    expect(run.by('students')[0]?.record.columns['status']).toBe('new');
    expect(run.issues.find((i) => i.code === 'status_downgrade')?.detail).toBe(
      'subs_register_only→new',
    );
  });

  it('a subscribed child missing from the registry is a review row, with the ATT row count', () => {
    const folder = att('سلمى');
    const run = pipeline(
      bundleOf({
        hub_students: [studentRow({})],
        subs_students: [subs({ student_name: 'سلمى', lessons_count: 4 })],
        att_attendance: [folder, folder],
      }),
      MODULES,
    );
    const missing = run.issues.filter((i) => i.code === 'missing_ref');
    expect(missing).toMatchObject([
      { severity: 'review', entity: 'students', ref: { source: 'SUBS' } },
    ]);
    expect(missing[0]?.detail).toContain('teacher=hend, lessons=4, attendance_rows=2');
  });

  it('an ATT folder of an unknown student (not in SUBS) is a review row too', () => {
    const folder = att('ميار');
    const run = pipeline(
      bundleOf({ hub_students: [studentRow({})], att_attendance: [folder] }),
      MODULES,
    );
    expect(run.issues.filter((i) => i.code === 'missing_ref')).toMatchObject([
      { severity: 'review', ref: { source: 'ATT' } },
    ]);
  });
});

describe('students: what the lesson reports say', () => {
  it('an attended chargeable lesson without a payment → pending_subscription, not active', () => {
    const run = pipeline(
      bundleOf({ hub_students: [studentRow({})], hub_reports: [reportRow({})] }),
      MODULES,
    );
    expect(run.by('students')[0]?.record.columns['status']).toBe('pending_subscription');
  });

  it('an attended free trial lesson does not: pending_subscription', () => {
    const trial = reportRow({ lesson_number_text: 'التجريبيه' });
    const run = pipeline(
      bundleOf({ hub_students: [studentRow({})], hub_reports: [trial] }),
      MODULES,
    );
    expect(run.by('students')[0]?.record.columns['status']).toBe('pending_subscription');
  });

  it('a stale registry teacher yields to the one teacher of every report, for review', () => {
    const run = pipeline(
      bundleOf({
        hub_students: [studentRow({ teacher: 'abrar' })],
        hub_reports: [reportRow({ teacher_slug: 'hend' })],
      }),
      MODULES,
    );
    expect(run.by('students')[0]?.record.refs['teacher_id']).toEqual(keys.teacher('hend'));
    expect(run.issues.filter((i) => i.code !== 'status_downgrade')).toMatchObject([
      { code: 'conflict', severity: 'review', field: 'teacher' },
    ]);
  });
});
