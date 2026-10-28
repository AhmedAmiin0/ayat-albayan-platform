import { describe, expect, it } from 'vitest';
import { storedContent, v2DraftColumns, v2Fields, v2SubmitColumns } from './report-v2.mapper';

const segments = [{ kind: 'new' as const, surah: 67, from: 16, to: 22, grade: 'excellent' as const }];
const content = { segments, tajweed: null, arabic: null, islamic: null, quick: [] };

describe('report-v2.mapper', () => {
  it('reads content only on a v2 row; unreadable content reads as null', () => {
    expect(v2Fields({ form_version: 1, content: null })).toEqual({ form_version: 1, content: null });
    expect(v2Fields({ form_version: 2, content: { segments } })).toEqual({ form_version: 2, content });
    expect(storedContent({ form_version: 2, content: { segments: [{ kind: 'x' }] } })).toBeNull();
    expect(storedContent({ form_version: 1, content: { segments } })).toBeNull();
  });

  it('autosave writes the shared v1 columns and the content, only when sent', () => {
    expect(v2DraftColumns({ nextPlan: 'x' })).toEqual({ next_plan: 'x' });
    expect(v2DraftColumns({ overall: 'good', content })).toEqual({ grade_overall: 'good', content });
  });

  it('submit clears what an absent student’s report never shows', () => {
    const form = { expectedVersion: 0, attendance: 'excused' as const, program: 'quran' as const, content, overall: 'good' as const, homework: 'h', notes: 'n' };
    const { columns, content: kept } = v2SubmitColumns(form);
    expect(kept.segments).toEqual([]);
    expect(columns).toMatchObject({ attendance: 'excused', notes: 'n', homework: null, grade_overall: null, grade_memorization: null });
    expect(v2SubmitColumns({ ...form, attendance: 'on_time' }).columns).toMatchObject({ grade_memorization: 'excellent', grade_overall: 'good', homework: 'h' });
  });

  it('untouched homework / plan on a Quran report: the Arabic suggestion; a typed one (even empty) is kept', () => {
    const form = { expectedVersion: 0, attendance: 'on_time' as const, program: 'quran' as const, content, overall: 'good' as const };
    expect(v2SubmitColumns(form).columns).toMatchObject({
      homework: 'مراجعة سورة الملك من الآية 16 إلى 22 يوميًا.',
      next_plan: 'الحفظ الجديد: سورة الملك 23–29',
    });
    expect(v2SubmitColumns({ ...form, homework: null, nextPlan: 'x' }).columns).toMatchObject({ homework: null, next_plan: 'x' });
    expect(v2SubmitColumns({ ...form, program: 'arabic' }).columns).toMatchObject({ homework: null, next_plan: null });
  });
});
