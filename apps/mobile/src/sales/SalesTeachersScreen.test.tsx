import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { teacher } from './fixtures';
import { SalesTeachersScreen } from './SalesTeachersScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

beforeEach(() => mockApiFetch.mockReset());

test('every active teacher with gender, programs and their students (read-only, no buttons)', async () => {
  mockApiFetch.mockResolvedValue([teacher(), teacher({ id: 't2', name: 'خالد', name_en: null, gender: 'male', students: [] })]);
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByText('أبرار محمد')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/teachers');
  expect(screen.getByLabelText(t.sales.mobile.studentsOf.replace('{name}', 'أبرار محمد'))).toBeTruthy();
  expect(screen.getByText('جنى علي')).toBeTruthy();
  expect(screen.getByText(ltr('AB-0190'))).toBeTruthy();
  expect(screen.getByText(t.sales.teachers.noStudents)).toBeTruthy();
  expect(screen.getByText(`${t.enums.gender.female} · ${t.enums.program.quran}${t.common.listSeparator}${t.enums.program.arabic}`)).toBeTruthy();
  // Only «رجوع»: a teacher row opens nothing (no pay, phone or calendar for sales).
  expect(screen.getAllByRole('button')).toHaveLength(1);
});

test('no teachers shows the empty state; a failed read shows the error', async () => {
  mockApiFetch.mockResolvedValue([]);
  const first = await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByText(t.sales.teachers.empty)).toBeTruthy();
  await first.unmount();
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByRole('alert')).toBeTruthy();
});
