// review.xlsx sheets: each owner question gets its own tab.
import { describe, expect, it } from 'vitest';
import type { RowIssue } from '../types.ts';
import { type ReviewPlan, reviewSheets } from './review.ts';

const ref = { source: 'HUB' as const, tab: 'الطلاب', row: 5 };
const issue = (o: Partial<RowIssue> & Pick<RowIssue, 'code' | 'severity'>): RowIssue => ({
  entity: 'students',
  ref,
  ...o,
});
const plan: ReviewPlan = {
  target: 'staging',
  createdAt: '2026-10-02T00:00:00Z',
  items: [
    {
      key: { entity: 'guardians', key: '+201000000001' },
      action: 'adopt',
      targetId: 'g-1',
      hash: 'h',
      record: { columns: {}, refs: {} },
      ref,
    },
  ],
  issues: [
    issue({ code: 'test_row', severity: 'reject' }),
    issue({ code: 'merge_candidate', severity: 'review', detail: 'نوره ~ نورة' }),
    issue({ code: 'conflict', severity: 'review', entity: 'schedule_rules' }),
    issue({
      code: 'duplicate',
      severity: 'warn',
      entity: 'lesson_reports',
      ref: { ...ref, file: 'f.xlsx' },
    }),
    issue({ code: 'unknown_teacher', severity: 'reject', field: 'teacher' }),
    issue({ code: 'missing_ref', severity: 'reject', entity: 'lessons', field: 'teacher_id' }),
    issue({ code: 'missing_ref', severity: 'review', entity: 'report_pdfs', detail: 'no report' }),
    issue({ code: 'unmapped_value', severity: 'review', field: 'package' }),
    issue({ code: 'bad_phone', severity: 'warn' }),
  ],
  counts: { students: { create: 3, update: 0, adopt: 0, skip: 1, reject: 1, review: 1 } },
  changes: [
    { entity: 'students', key: 'k', ref, field: 'byday', from: [6], to: [6, 2] },
    { entity: 'students', key: 'k', ref, field: 'age', from: null, to: 9 },
  ],
};

describe('reviewSheets', () => {
  it('has one tab per owner question, rejected rows complete', () => {
    const s = Object.fromEntries(reviewSheets(plan).map((x) => [x.sheet, x.data.length - 1]));
    expect(s).toEqual({
      summary: 1,
      'merges proposed': 1,
      'duplicates to decide': 2,
      rejected: 3,
      'unmatched PDFs': 1,
      'missing teachers': 2,
      changes: 2,
      adopted: 1,
      review: 1,
      warnings: 1,
    });
  });

  it('carries the source reference and reason for the owner', () => {
    const dup = reviewSheets(plan).find((x) => x.sheet === 'duplicates to decide');
    expect(dup?.data[2]).toEqual([
      'lesson_reports',
      'duplicate',
      'HUB',
      'الطلاب',
      5,
      'f.xlsx',
      null,
      null,
    ]);
  });

  it('writes field changes as cells', () => {
    const changes = reviewSheets(plan).find((x) => x.sheet === 'changes');
    expect(changes?.data[1]).toEqual([
      'students',
      'k',
      'HUB',
      'الطلاب',
      5,
      'byday',
      '[6]',
      '[6,2]',
    ]);
    expect(changes?.data[2]?.slice(-2)).toEqual([null, 9]);
  });

  it('reads a plan.json written before changes existed', () => {
    const old: ReviewPlan = { ...plan, changes: undefined };
    expect(reviewSheets(old).find((x) => x.sheet === 'changes')?.data).toHaveLength(1);
  });
});
