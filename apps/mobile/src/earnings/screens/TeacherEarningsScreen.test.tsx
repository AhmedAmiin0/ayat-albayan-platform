import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { BALANCE, page, PAYMENT, SESSIONS } from '@/earnings/testing/fixtures';
import { TeacherEarningsScreen } from './TeacherEarningsScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({ id: 't1' }) }));
jest.mock('@/core/ui/form/ReceiptPicker', () => ({ ReceiptPicker: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation((p: string) =>
    Promise.resolve(p.includes('/sessions') ? page(SESSIONS) : p.includes('/payments') ? page([PAYMENT]) : BALANCE),
  );
});

const rowFor = (label: string) => screen.getByLabelText(new RegExp(`^${t.earnings.selectRow.split('{date}')[0]}${label}`));

test('the admin reads /teacher-earnings/:id and sees the balance of that teacher', async () => {
  await renderWithQuery(<TeacherEarningsScreen />);
  expect(await screen.findByText(/أبرار/)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teacher-earnings/t1');
  expect(await screen.findByText(t.earnings.statusName.partially_paid)).toBeTruthy();
});

test('a fully paid lesson cannot be ticked; ticking names the count on the pay button', async () => {
  await renderWithQuery(<TeacherEarningsScreen />);
  await screen.findByText(t.earnings.statusName.partially_paid);
  const boxes = screen.getAllByRole('checkbox');
  expect(boxes).toHaveLength(3);
  expect(boxes[2]?.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(boxes[1] as never);
  expect(screen.getByText(t.earnings.payChosen.replace('{count}', '1'))).toBeTruthy();
  expect(rowFor('2 سبتمبر').props.accessibilityState.checked).toBe(true);
});

test('paying the ticked lesson: the form defaults to what it owes and posts its id', async () => {
  mockApiSend.mockResolvedValue({ payment: PAYMENT, replayed: false });
  await renderWithQuery(<TeacherEarningsScreen />);
  await screen.findByText(t.earnings.statusName.partially_paid);
  await fireEvent.press(screen.getAllByRole('checkbox')[1] as never);
  await fireEvent.press(screen.getByText(t.earnings.payChosen.replace('{count}', '1')));
  expect(screen.getByDisplayValue('60')).toBeTruthy();
  await fireEvent.changeText(screen.getByDisplayValue('60'), '25.5');
  await fireEvent.press(screen.getByText(t.enums.paymentMethod.cash));
  await fireEvent.press(screen.getByText(t.earnings.confirm));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/teacher-earnings/t1/payments', expect.objectContaining({ amount: 25.5, method: 'cash', earningIds: ['e2'] }));
  expect(await screen.findByText(t.earnings.saved)).toBeTruthy();
});

test('more than the ticked lesson owes is refused on the form and nothing is sent', async () => {
  await renderWithQuery(<TeacherEarningsScreen />);
  await screen.findByText(t.earnings.statusName.partially_paid);
  await fireEvent.press(screen.getAllByRole('checkbox')[1] as never);
  await fireEvent.press(screen.getByText(t.earnings.payChosen.replace('{count}', '1')));
  await fireEvent.changeText(screen.getByDisplayValue('60'), '60.01');
  await fireEvent.press(screen.getByText(t.payments.mobile.takePhoto === '' ? '' : t.enums.paymentMethod.bank));
  await fireEvent.press(screen.getByText(t.earnings.confirm));
  expect(await screen.findByText(t.earnings.overpayment.replace('{amount}', '⁦60⁩ ج.م'))).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});
