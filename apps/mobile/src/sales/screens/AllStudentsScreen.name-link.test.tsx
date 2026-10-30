import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { myStudent } from '@/sales-money/testing/fixtures';
import { renderWithQuery } from '@/test/query';
import { type } from '@/theme';
import { AllStudentsScreen } from './AllStudentsScreen';
import { student } from '@/sales/testing/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const label = (name: string) => t.sales.allStudents.openStudent.replace('{name}', name);

beforeEach(() => {
  jest.mocked(router.push).mockClear();
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation((path: string) =>
    Promise.resolve(path === '/sales/me/students' ? [myStudent()] : page([student()])),
  );
});

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity));
const inSales = () =>
  renderWithQuery(<TreeBaseProvider value="/sales"><AllStudentsScreen asTab /></TreeBaseProvider>);

test('«كل الطلاب» (owner 2026-10-30): the name is the header, a link to «تفاصيل الطالب»', async () => {
  await inSales();
  const name = await screen.findByText('يوسف أحمد');
  const header = { fontSize: type.size.lg, fontFamily: type.ui[700] };
  expect(flat(name.props.style)).toMatchObject(header);
  expect(name.props.numberOfLines).toBe(1);
  await fireEvent.press(screen.getByRole('link', { name: label('يوسف أحمد') }));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1');
});

test('«طلابي»: the name opens the student file, the row still opens the family channel', async () => {
  await inSales();
  await fireEvent.press(screen.getByRole('tab', { name: t.assistantPortal.nav.students }));
  const name = await screen.findByText('سهيلة');
  expect(flat(name.props.style)).toMatchObject({ fontSize: type.size.lg });
  await fireEvent.press(screen.getByRole('link', { name: label('سهيلة') }));
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(router.push).toHaveBeenCalledWith(`/sales/students/${myStudent().id}`);
  expect(screen.getByText(t.assistantPortal.students.paid)).toBeTruthy();
});
