import type { StudentRecordingView } from '@ab/shared';
import type { TeacherChoice } from './RecordingFiltersBar';
import { recording } from './fixtures';
import { renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { mergeChoices, useTeacherChoices } from './teacher-choices';

test('every active teacher plus the ones on the loaded rows, once each', () => {
  const rows = [recording(), recording({ id: 'r2', teacher: { id: 't9', display_name_ar: 'سلمى', display_name_en: null } }), recording({ id: 'r3', teacher: null })];
  const all = [{ id: 't1', display_name_ar: 'أبرار' }, { id: 't2', display_name_ar: 'منى' }];
  expect(mergeChoices(rows, all)).toEqual([
    { id: 't1', name: 'أبرار' },
    { id: 't2', name: 'منى' },
    { id: 't9', name: 'سلمى' },
  ]);
  expect(mergeChoices([], [])).toEqual([]);
});

test('a teacher keeps the choices seen so far once the server filter narrows the rows', async () => {
  const t1 = recording();
  const t2 = recording({ id: 'r2', teacher: { id: 't2', display_name_ar: 'منى', display_name_en: null } });
  const { result, rerender } = await renderHook<TeacherChoice[], { rows: StudentRecordingView[] }>(({ rows }) => useTeacherChoices(rows, false), { initialProps: { rows: [t1, t2] }, wrapper: queryWrapper(createTestQueryClient()) });
  expect(result.current.map((c) => c.id)).toEqual(['t1', 't2']);
  await rerender({ rows: [t2] });
  expect(result.current.map((c) => c.id)).toEqual(['t1', 't2']);
});
