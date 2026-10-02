import { describe, expect, it } from 'vitest';
import { submitColumns } from './report.mapper';
import { ADMIN, AFTER, FULL_GRADES, LESSON_ID, REPORT_ID, reportRow, STARTS_AT, STUDENT_ID, submittedRow } from './reports.fakes';
import { lessonOutcome, submitPayload, type SubmitPlanInput } from './submit-plan';

function input(over: Partial<SubmitPlanInput> = {}): SubmitPlanInput {
  const attendance = over.attendance ?? 'on_time';
  return {
    report: reportRow(),
    lesson: { id: LESSON_ID, status: 'scheduled', starts_at: STARTS_AT },
    current: { attendance: null, chargeable: true },
    columns: submitColumns({ attendance, grades: FULL_GRADES, overall: 'excellent' }),
    attendance,
    actor: ADMIN.id,
    now: AFTER,
    lateCancelHours: null,
    ...over,
  };
}

describe('submitPayload: versions (R-REP-02 versioned, R-REP-04 resubmit updates)', () => {
  it('first submit: version 1, submitted now, not an edit; expects version 0', () => {
    const p = submitPayload(input());
    expect(p).toMatchObject({ report_id: REPORT_ID, expected_version: 0, actor: ADMIN.id });
    expect(p.report).toMatchObject({ version: 1, submitted_at: AFTER.toISOString(), edited_at: null, attendance: 'on_time' });
  });

  it('an edit keeps the first submit (window anchor) and marks edited_at', () => {
    const first = '2026-10-04T14:50:00.000Z';
    const p = submitPayload(input({ report: submittedRow({ version: 2, submitted_at: first }) }));
    expect(p.expected_version).toBe(2);
    expect(p.report).toMatchObject({ version: 3, submitted_at: first, edited_at: AFTER.toISOString() });
  });
});

describe('lessonOutcome: open lesson → the shared state machine (R-REP-03)', () => {
  it.each([
    { attendance: 'on_time', status: 'completed', chargeable: true },
    { attendance: 'late', status: 'late', chargeable: true },
    { attendance: 'absent', status: 'no_show', chargeable: true },
    { attendance: 'excused', status: 'excused', chargeable: false },
  ] as const)('$attendance → $status (chargeable $chargeable)', ({ attendance, status, chargeable }) => {
    const out = lessonOutcome(input({ attendance }));
    expect(out.student).toBeUndefined();
    expect(out.lesson_change?.changes).toEqual([
      expect.objectContaining({
        id: LESSON_ID,
        from_status: 'scheduled',
        to_status: status,
        attendance,
        chargeable,
        students: [{ student_id: STUDENT_ID, attendance, chargeable }],
      }),
    ]);
    expect(out.lesson_change).toMatchObject({
      actor: ADMIN.id,
      audit: { entity: 'lessons', entity_id: LESSON_ID, action: 'status_change', before: { status: 'scheduled' } },
    });
  });

  it('a confirmed lesson moves too (compare-and-set on confirmed)', () => {
    const out = lessonOutcome(input({ lesson: { id: LESSON_ID, status: 'confirmed', starts_at: STARTS_AT } }));
    expect(out.lesson_change?.changes?.[0]).toMatchObject({ from_status: 'confirmed', to_status: 'completed' });
  });

  it('a late excuse is chargeable when the late-cancel policy is on', () => {
    const out = lessonOutcome(input({ attendance: 'excused', lateCancelHours: 24 }));
    expect(out.lesson_change?.changes?.[0]).toMatchObject({ to_status: 'excused', chargeable: true });
  });
});

describe('lessonOutcome: lesson already has an outcome → only this student is synced', () => {
  const done = { id: LESSON_ID, status: 'completed', starts_at: STARTS_AT } as const;

  it('attendance marked on the card already matches → nothing to write (journey 2)', () => {
    expect(lessonOutcome(input({ lesson: done, current: { attendance: 'on_time', chargeable: true } }))).toEqual({});
  });

  it('the report says absent → the student row becomes absent, still chargeable', () => {
    const out = lessonOutcome(input({ lesson: done, attendance: 'absent', current: { attendance: 'on_time', chargeable: true } }));
    expect(out).toEqual({ student: { attendance: 'absent', chargeable: true } });
  });

  it('the report says excused (policy off) → not chargeable', () => {
    const out = lessonOutcome(input({ lesson: done, attendance: 'excused', current: { attendance: 'on_time', chargeable: true } }));
    expect(out).toEqual({ student: { attendance: 'excused', chargeable: false } });
  });

  it('a student row missing from the lesson still gets a sync entry', () => {
    expect(lessonOutcome(input({ lesson: done, current: null }))).toEqual({
      student: { attendance: 'on_time', chargeable: true },
    });
  });
});
