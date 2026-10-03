import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { BALANCE, page, PAYMENT, SESSIONS } from './fixtures';
import { MyEarningsScreen } from './MyEarningsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: (p: string) => mockPush(p) } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation((p: string) =>
    Promise.resolve(p.includes('/sessions') ? page(SESSIONS) : p.includes('/payments') ? page([PAYMENT]) : BALANCE),
  );
});

test('«مستحقاتي»: the three cards and every lesson with its status, from the /teachers/me routes only', async () => {
  await renderWithQuery(<MyEarningsScreen />);
  expect(await screen.findByText(t.earnings.outstanding)).toBeTruthy();
  expect(await screen.findByText(t.earnings.statusName.partially_paid)).toBeTruthy();
  expect(screen.getByText(t.earnings.statusName.paid)).toBeTruthy();
  expect(mockApiFetch.mock.calls.every(([p]) => String(p).startsWith('/teachers/me/earnings'))).toBe(true);
});

test('read only: no ticks, no pay button; the monthly statements are one tap away', async () => {
  await renderWithQuery(<MyEarningsScreen />);
  await screen.findByText(t.earnings.statusName.partially_paid);
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.queryByText(t.earnings.pay)).toBeNull();
  await fireEvent.press(screen.getByText(t.earnings.monthly));
  expect(mockPush).toHaveBeenCalledWith('/teacher/more/payouts');
});

test('«الدفعات» lists what was paid to me; the unpaid filter asks the API for it', async () => {
  await renderWithQuery(<MyEarningsScreen />);
  await fireEvent.press(await screen.findByText(t.earnings.filter.unpaid));
  await screen.findByText(t.earnings.outstanding);
  expect(mockApiFetch.mock.calls.some(([p]) => String(p).includes('status=unpaid'))).toBe(true);
  await fireEvent.press(screen.getByText(t.earnings.mobile.payments));
  expect(await screen.findByText(/دفعة أكتوبر/)).toBeTruthy();
});
