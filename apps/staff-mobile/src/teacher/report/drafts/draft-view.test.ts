import { reportDraftSchema, reportV2DraftSchema } from '@ab/shared';
import { reportView } from '@/teacher/report/testing/fixtures';
import { viewWithDraft } from './draft-view';

test('a v1 draft overlays the fields it carries, in the view names', () => {
  const view = reportView({ notes: 'قديم', homework: 'واجب' });
  const draft = reportDraftSchema.parse({
    attendance: 'on_time',
    recited: 'الملك 1-5',
    newMemorization: 'الملك 6-10',
    grades: { tajweed: 'excellent' },
    overall: 'very_good',
    nextPlan: 'الملك 11-15',
    notes: '',
  });
  const out = viewWithDraft(view, draft);
  expect(out.attendance).toBe('on_time');
  expect(out.recited).toBe('الملك 1-5');
  expect(out.new_memorization).toBe('الملك 6-10');
  expect(out.grades.tajweed).toBe('excellent');
  expect(out.grade_overall).toBe('very_good');
  expect(out.next_plan).toBe('الملك 11-15');
  expect(out.notes).toBeNull();
  expect(out.homework).toBe('واجب');
});

test('a v2 draft overlays its content and keeps what it leaves out', () => {
  const view = reportView({ homework: 'واجب', program: 'quran' });
  const content = { segments: [] };
  const out = viewWithDraft(view, reportV2DraftSchema.parse({ program: 'arabic', content }));
  expect(out.program).toBe('arabic');
  expect(out.content).toEqual(expect.objectContaining({ segments: [] }));
  expect(out.homework).toBe('واجب');
});
