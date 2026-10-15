// Imported status (R-STU-05, docs/18): active stays active; otherwise an attended (on_time / late)
// trial report → pending_subscription, else new. Never trial: one-off bookings are not imported.
import { describe, expect, it } from 'vitest';
import { bundleOf, pipeline, reportRow, studentRow } from '../../sources/sheets/fixtures.ts';
import type { SourceRow } from '../../types.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { guardiansModule } from './guardians.ts';
import { studentsModule } from './students.ts';

const MODULES = [teachersModule, guardiansModule, studentsModule];
const trial = (attendance: string, row?: number) =>
  reportRow({ lesson_number_text: 'التجريبيه', attendance }, { row });

function statusOf(o: { student?: Record<string, string>; reports?: SourceRow[] }) {
  const run = pipeline(
    bundleOf({ hub_students: [studentRow(o.student ?? {})], hub_reports: o.reports ?? [] }),
    MODULES,
  );
  return run.by('students')[0]?.record.columns['status'];
}

describe('students: imported status', () => {
  it('a current student stays active, with or without a trial report', () => {
    expect(statusOf({ student: { status: 'طالب حالي' } })).toBe('active');
    expect(statusOf({ student: { status: 'طالب حالي' }, reports: [trial('حضرت في الموعد')] })).toBe(
      'active',
    );
  });

  it('an on-time or late trial report → pending_subscription', () => {
    expect(statusOf({ reports: [trial('حضرت في الموعد')] })).toBe('pending_subscription');
    expect(statusOf({ reports: [trial('حضرت متأخرة')] })).toBe('pending_subscription');
  });

  it('absent / excused-only trial reports → new', () => {
    expect(statusOf({ reports: [trial('اعتذرت مسبقًا')] })).toBe('new');
    expect(statusOf({ reports: [trial('غابت')] })).toBe('new');
  });

  it('no report at all → new, never trial', () => {
    expect(statusOf({})).toBe('new');
  });
});
