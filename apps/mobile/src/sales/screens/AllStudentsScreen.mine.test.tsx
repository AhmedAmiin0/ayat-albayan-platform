import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { myStudent } from '@/sales-money/testing/fixtures';
import { renderWithQuery } from '@/test/query';
import { AllStudentsScreen } from './AllStudentsScreen';
import { student } from '../testing/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const S = t.assistantPortal.students;
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const mine = (rows: unknown) => (path: string) =>
  path === '/sales/me/students' ? (rows instanceof Error ? Promise.reject(rows) : Promise.resolve(rows)) : Promise.resolve(page([student()]));

beforeEach(() => mockApiFetch.mockReset());

test('«كل الطلاب» is the default and never asks for /sales/me/students', async () => {
  mockApiFetch.mockImplementation(mine([myStudent()]));
  await renderWithQuery(<AllStudentsScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/sales/me/students');
  expect(screen.getByRole('tab', { name: t.sales.allStudents.title, selected: true })).toBeTruthy();
});

test('«طلابي» filters to GET /sales/me/students: paid or not and my commission, never a price', async () => {
  mockApiFetch.mockImplementation(mine([myStudent(), myStudent({ id: 's2', name: 'جنى', code: 'AB-1002', first_subscription_paid: false, commission: null })]));
  await renderWithQuery(<AllStudentsScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: t.assistantPortal.nav.students }));
  expect(await screen.findByText('سهيلة')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/students');
  expect(screen.getByText(S.paid)).toBeTruthy();
  expect(screen.getByText(S.unpaid)).toBeTruthy();
  expect(screen.getByText(t.assistantPortal.commission.earned)).toBeTruthy();
  expect(screen.queryByLabelText(t.sales.allStudents.search)).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.sales.allStudents.title }));
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
});

test('«طلابي» empty: the web’s words and hint', async () => {
  mockApiFetch.mockImplementation(mine([]));
  await renderWithQuery(<AllStudentsScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: t.assistantPortal.nav.students }));
  expect(await screen.findByText(S.empty)).toBeTruthy();
  expect(screen.getByText(S.emptyHint)).toBeTruthy();
});

test('«طلابي» failed: the error with a retry', async () => {
  mockApiFetch.mockImplementation(mine(new Error('offline')));
  await renderWithQuery(<AllStudentsScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: t.assistantPortal.nav.students }));
  await waitFor(() => expect(screen.getByText(t.sales.loadFailed)).toBeTruthy());
});
