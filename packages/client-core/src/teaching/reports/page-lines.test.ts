import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { emptyContent, type ReportPageReport } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { pageLines } from './page-lines';

const words = {
  text: { v2: ar.reports.v2, grade: ar.enums.grade, program: ar.enums.program, lang: 'ar' as const },
  v1: ar.reports,
};
const grades: ReportPageReport['grades'] = {
  recitation: null, memorization: null, revision: null, tajweed: null, engagement: null,
  commitment: null,
};
const report = (over: Partial<ReportPageReport> = {}): ReportPageReport => ({
  form_version: 2, attendance: 'on_time', program: 'quran', recited: null,
  new_memorization: null, revision: null, theory: null, grades, grade_overall: 'excellent',
  notes: 'أداء ممتاز', homework: 'مراجعة الملك', next_plan: null, content: emptyContent(),
  version: 1, submitted_at: '2026-10-04T15:00:00Z', edited_at: null, ...over,
});

describe('pageLines', () => {
  it("a new-form report: the new form's lines only", () => {
    const keys = pageLines(report(), words).map((l) => l.key);
    expect(keys.slice(0, 2)).toEqual(['attendance', 'program']);
    expect(keys).not.toContain('recited');
  });

  it('an original-form report: its four text answers after the attendance and the program', () => {
    const lines = pageLines(report({ form_version: 1, recited: 'الملك 1–15', content: null }), words);
    expect(lines.slice(0, 6).map((l) => l.key)).toEqual([
      'attendance', 'program', 'recited', 'newMemorization', 'revision', 'theory',
    ]);
    expect(lines[2]?.value).toBe('الملك 1–15');
  });
});
