import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { pageView } from './page.fixture';
import { pageLines } from './page-lines';

const words = () => ({
  text: { v2: t.reports.v2, grade: t.enums.grade, program: t.enums.program, lang: 'ar' as const },
  v1: t.reports,
});

describe('pageLines', () => {
  it("a new-form report: the new form's lines only", () => {
    const keys = pageLines(pageView().report, words()).map((l) => l.key);
    expect(keys.slice(0, 2)).toEqual(['attendance', 'program']);
    expect(keys).not.toContain('recited');
  });

  it('an original-form report: its four text answers after the attendance and the program', () => {
    const report = {
      ...pageView().report,
      form_version: 1 as const,
      recited: 'الملك 1–15',
      content: null,
    };
    const lines = pageLines(report, words());
    expect(lines.slice(0, 6).map((l) => l.key)).toEqual([
      'attendance',
      'program',
      'recited',
      'newMemorization',
      'revision',
      'theory',
    ]);
    expect(lines[2]?.value).toBe('الملك 1–15');
  });
});
