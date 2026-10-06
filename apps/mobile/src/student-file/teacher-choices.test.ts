import { recording } from './fixtures';
import { mergeChoices } from './teacher-choices';

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
