import { programOf } from './report-program';
import { reportView } from './fixtures';

test('the report’s saved program wins; without one the student’s own is used', () => {
  expect(programOf(reportView(), 'quran')).toBe('quran');
  expect(programOf({ ...reportView(), program: null } as never, 'arabic')).toBe('arabic');
  expect(programOf({ ...reportView(), program: 'islamic_studies' } as never, 'quran')).toBe('islamic_studies');
});
