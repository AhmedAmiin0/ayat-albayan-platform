// lessons, lesson_students, lesson_reports from invented report rows, and their custom writes.
import { describe, expect, it } from 'vitest';
import type { TargetTx } from '../../db/target.ts';
import type { WriteContext } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, reportRow, studentRow } from '../../sources/sheets/fixtures.ts';
import type { PlanItem } from '../../types.ts';
import { lessonStudentsModule, lessonsModule, writeLessonStudent } from '../lessons/lessons.ts';
import { guardiansModule } from '../people/guardians.ts';
import { studentsModule } from '../people/students.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { lessonReportsModule, writeLessonReport } from './reports.ts';

const MODULES = [
  teachersModule,
  guardiansModule,
  studentsModule,
  lessonsModule,
  lessonStudentsModule,
  lessonReportsModule,
];
const S = keys.student({ guardianPhone: '+966551110001', name: 'ليان' });
const L = keys.lesson({ teacher: 'abrar', students: [S.key], at: '2026-09-10' });

describe('report modules', () => {
  const run = pipeline(
    bundleOf({
      hub_students: [studentRow({})],
      hub_reports: [
        reportRow({ attendance: 'حضرت متأخرة', meeting_link: 'Zoom' }),
        reportRow({
          attendance: 'حضرت متأخرة',
          meeting_link: 'Zoom',
          submitted_at: '2026-09-10T21:53:00',
        }),
        reportRow({ lesson_date: '2066-08-11' }),
      ],
    }),
    MODULES,
  );

  it('one past lesson per reported student and day, status from attendance, no rule', () => {
    expect(run.by('lessons')).toMatchObject([
      {
        key: L,
        record: {
          columns: {
            starts_at: '2026-09-10T09:00:00.000Z',
            ends_at: '2026-09-10T09:45:00.000Z',
            status: 'late',
            meeting_link: null,
          },
          refs: { teacher_id: keys.teacher('abrar') },
        },
      },
    ]);
    expect(run.by('lessons')[0]?.record.columns).not.toHaveProperty('rule_id');
    expect(run.by('lesson_students')[0]?.record).toEqual({
      columns: { attendance: 'late', chargeable: true },
      refs: { lesson_id: L, student_id: S },
    });
  });

  it('a submitted version-1 report; duplicates and bad dates reported once', () => {
    const [r] = run.by('lesson_reports');
    expect(r?.record.columns).toMatchObject({
      attendance: 'late',
      status: 'submitted',
      version: 1,
      submitted_at: '2026-09-10T16:30:05.000Z',
      sent_at: '2026-09-10T16:30:05.000Z',
      grade_overall: 'excellent',
    });
    expect(r?.record.refs).toEqual({
      lesson_id: L,
      student_id: S,
      teacher_id: keys.teacher('abrar'),
    });
    expect(run.issues.map((i) => [i.entity, i.code])).toEqual([
      ['students', 'status_downgrade'], // reported lessons, no payment: pending_subscription
      ['lesson_reports', 'missing_field'], // start time unknown (warn), first report
      ['lesson_reports', 'bad_date'],
      ['lesson_reports', 'duplicate'],
    ]);
  });
});

function fakeTx() {
  const calls: unknown[] = [];
  const tx: TargetTx = {
    insert: async (spec) => (calls.push(spec), spec.returning === null ? null : 'r1'),
    update: async (spec) => void calls.push({ update: spec }),
    recordItem: async () => {},
    exec: async (q) => void calls.push(q),
  };
  return { tx, calls };
}
const item = (action: PlanItem['action']): PlanItem => ({
  key: keys.lessonReport({ lesson: L.key, student: S.key }),
  action,
  targetId: action === 'create' ? null : 'r1',
  hash: 'h',
  record: { columns: {}, refs: {} },
  ref: { source: 'HUB', tab: 't', row: 2 },
});
const ctx = (o: Pick<WriteContext, 'tx' | 'item' | 'columns'>): WriteContext => o;

describe('writes', () => {
  it('a new report gets its first version row (as submit_report leaves it)', async () => {
    const { tx, calls } = fakeTx();
    const r = await writeLessonReport(
      ctx({ tx, item: item('create'), columns: { status: 'submitted', version: 1 } }),
    );
    expect(r.targetId).toBe('r1');
    expect(calls[1]).toEqual({
      table: 'lesson_report_versions',
      columns: {
        report_id: 'r1',
        version: 1,
        snapshot: { status: 'submitted', version: 1, id: 'r1' },
      },
    });
    // A re-import updates content only: an in-app edit keeps its version and send time.
    const u = fakeTx();
    const columns = {
      notes: 'x',
      status: 'submitted',
      version: 1,
      submitted_at: 't',
      sent_at: 't',
    };
    await writeLessonReport(ctx({ tx: u.tx, item: item('update'), columns }));
    expect(u.calls).toEqual([
      { update: { table: 'lesson_reports', id: 'r1', columns: { notes: 'x' } } },
    ]);
  });

  it('lesson_students: insert-or-nothing, update by the composite key', async () => {
    const { tx, calls } = fakeTx();
    const columns = { lesson_id: 'l1', student_id: 's1', attendance: 'late', chargeable: false };
    await writeLessonStudent(ctx({ tx, item: item('create'), columns }));
    await writeLessonStudent(ctx({ tx, item: item('update'), columns }));
    expect(calls[0]).toEqual({ table: 'lesson_students', columns, returning: null });
    expect(calls[1]).toMatchObject({ params: ['l1', 's1', 'late', false] });
  });
});
