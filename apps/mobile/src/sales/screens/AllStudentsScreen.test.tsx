import { formatPhone } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { AllStudentsScreen } from './AllStudentsScreen';
import { student } from '../testing/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const page = (items: unknown[], total = items.length, n = 1) => ({ items, total, page: n, pageSize: 25 });

beforeEach(() => mockApiFetch.mockReset());

test('every student: name, code, teacher · program, guardian phone and name, status; every row a button', async () => {
  mockApiFetch.mockResolvedValue(page([student(), student({ id: 'st2', name: 'جنى علي', code: 'AB-0190', teacher_name: null, status: 'trial' })]));
  await renderWithQuery(<AllStudentsScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/students\/all\?.*page=1/));
  expect(screen.getByText(ltr('AB-0190'))).toBeTruthy();
  expect(screen.getByText(`${t.sales.allStudents.noTeacher} · ${t.enums.program.quran}`)).toBeTruthy();
  expect(screen.getAllByText(t.sales.mobile.guardianLine.replace('{name}', 'أحمد سالم'))).toHaveLength(2);
  expect(screen.getByText(t.enums.studentStatus.trial)).toBeTruthy();
  expect(screen.getByRole('header', { name: `${t.sales.allStudents.title} · 2` })).toBeTruthy();
  expect(screen.getAllByText(ltr(formatPhone('+201001112223')))).toHaveLength(2);
  // The header's «رجوع» plus both rows (owner 2026-10-27: no row is a dead line).
  expect(screen.getAllByRole('button')).toHaveLength(3);
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

test('the sales tree: hers (`mine`) and another family\'s student both open «تفاصيل الطالب» (owner 2026-10-28)', async () => {
  const other = student({ id: 'st2', name: 'جنى علي', code: 'AB-0190', status: 'pending_subscription', guardian_phone: '+966551110000' });
  mockApiFetch.mockResolvedValue(page([student({ mine: true }), other]));
  await renderWithQuery(<TreeBaseProvider value="/sales"><AllStudentsScreen /></TreeBaseProvider>);
  await screen.findByText('يوسف أحمد');
  await fireEvent.press(screen.getByText('جنى علي'));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st2');
  await fireEvent.press(screen.getByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1');
});
