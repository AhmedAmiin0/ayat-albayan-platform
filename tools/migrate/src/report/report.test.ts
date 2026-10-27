import { describe, expect, it } from 'vitest';
import type { Plan, RowIssue } from '../types.ts';
import { reportMarkdown } from './report.ts';

const ref = { source: 'HUB' as const, tab: 'الطلاب', row: 5 };
const issues: RowIssue[] = [
  { code: 'test_row', severity: 'reject', entity: 'students', ref },
  { code: 'merge_candidate', severity: 'review', entity: 'students', ref, detail: 'نوره ~ نورة' },
  { code: 'conflict', severity: 'review', entity: 'schedule_rules', ref },
  {
    code: 'duplicate',
    severity: 'warn',
    entity: 'lesson_reports',
    ref: { ...ref, file: 'f.xlsx' },
  },
];
const plan: Plan = {
  target: 'staging',
  createdAt: '2026-10-02T00:00:00Z',
  items: [],
  issues,
  counts: { students: { create: 3, update: 0, adopt: 0, skip: 1, reject: 1, review: 1 } },
};

describe('reportMarkdown', () => {
  it('has counts and issue codes but no issue details', () => {
    const md = reportMarkdown({
      plan,
      manifest: {
        zip: 'x.zip',
        sha256: 'abcdef0123456789',
        extractedAt: '',
        rows: { hub_students: 9 },
        unknownHeaders: { hub_students: ['h'] },
      },
      crm: { contacts: 4 },
    });
    expect(md).toContain('| students | 3 | 0 | 0 | 1 | 1 | 1 |');
    expect(md).toContain('| students | test_row | reject | 1 |');
    expect(md).toContain('| hub_students | 9 |');
    expect(md).toContain('hub_students (1)');
    expect(md).toContain('| contacts | 4 |');
    expect(md).not.toContain('نوره');
  });
  it('counts students no longer active per old reason and status, nothing else', () => {
    const down = (detail: string): RowIssue => ({
      code: 'status_downgrade',
      severity: 'warn',
      entity: 'students',
      ref,
      field: 'status',
      detail,
    });
    const more = [down('hub_current_student→new'), down('hub_current_student→new')];
    const md = reportMarkdown({
      plan: { ...plan, issues: [...more, down('subs_register_only→new')] },
    });
    expect(md).toContain('## Student status: no longer «مشترك»');
    expect(md).toContain('| hub_current_student | new | 2 |');
    expect(md).toContain('| subs_register_only | new | 1 |');
    expect(reportMarkdown({ plan })).not.toContain('no longer');
  });

  it('shouts when the target is production', () => {
    expect(reportMarkdown({ plan: { ...plan, target: 'production' } })).toContain('PRODUCTION');
  });
});
