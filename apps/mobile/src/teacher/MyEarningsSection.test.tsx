import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { earningsView, PAYMENTS } from '@/teacher-earnings/fixtures';
import { egp } from '@/teacher-earnings/text';
import { renderWithQuery } from '@/test/query';
import { MyEarningsSection } from './MyEarningsSection';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const e = t.teacherEarnings;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => (path.endsWith('/payments') ? PAYMENTS : earningsView()));
});

test('my balance cards, sessions with their status and my payments, from the /me routes', async () => {
  await renderWithQuery(<MyEarningsSection />);
  expect(await screen.findByText(egp(240))).toBeTruthy();
  expect(screen.getByText(egp(90))).toBeTruthy();
  expect(screen.getByText(egp(150))).toBeTruthy();
  expect(screen.getByText(e.status.earned)).toBeTruthy();
  expect(screen.getByText(e.status.partially_paid)).toBeTruthy();
  expect(screen.getByText(e.status.paid)).toBeTruthy();
  expect(await screen.findByText(e.paymentLine.replace('{amount}', egp(90)).replace('{n}', '2'))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/earnings');
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/earnings/payments');
});

test('read-only: no pay action, no tick boxes, no select-all', async () => {
  await renderWithQuery(<MyEarningsSection />);
  await screen.findByText(egp(240));
  expect(screen.queryByRole('button', { name: e.pay })).toBeNull();
  expect(screen.queryByRole('button', { name: e.submit })).toBeNull();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.queryByText(e.selectAll)).toBeNull();
});

test('no sessions yet says so', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path.endsWith('/payments') ? [] : earningsView([])));
  await renderWithQuery(<MyEarningsSection />);
  expect(await screen.findByText(e.mineEmpty)).toBeTruthy();
  expect(screen.getByText(e.paymentsEmpty)).toBeTruthy();
});
