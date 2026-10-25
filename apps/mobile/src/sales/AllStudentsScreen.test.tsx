import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { AllStudentsScreen } from './AllStudentsScreen';
import { student } from './fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const page = (items: unknown[], total = items.length, n = 1) => ({ items, total, page: n, pageSize: 25 });

beforeEach(() => mockApiFetch.mockReset());

test('every student: name, code, teacher · program, guardian, status; no phone and not a button', async () => {
  mockApiFetch.mockResolvedValue(page([student(), student({ id: 'st2', name: 'جنى علي', code: 'AB-0190', teacher_name: null, status: 'trial' })]));
  await renderWithQuery(<AllStudentsScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/students\/all\?.*page=1/));
  expect(screen.getByText(ltr('AB-0190'))).toBeTruthy();
  expect(screen.getByText(`${t.sales.allStudents.noTeacher} · ${t.enums.program.quran}`)).toBeTruthy();
  expect(screen.getAllByText(t.sales.mobile.guardianLine.replace('{name}', 'أحمد سالم'))).toHaveLength(2);
  expect(screen.getByText(t.enums.studentStatus.trial)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.sales.allStudents.title })).toBeTruthy();
  expect(screen.getAllByRole('button')).toHaveLength(1);
});

test('the search goes to the server (name or code) and an empty answer says so', async () => {
  mockApiFetch.mockResolvedValue(page([student()]));
  await renderWithQuery(<AllStudentsScreen />);
  await screen.findByText('يوسف أحمد');
  mockApiFetch.mockResolvedValue(page([]));
  await fireEvent.changeText(screen.getByLabelText(t.sales.allStudents.search), 'AB-9');
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('search=AB-9')));
  expect(await screen.findByText(t.sales.allStudents.empty)).toBeTruthy();
});

test('a failed read with nothing cached shows the error', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<AllStudentsScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
});
