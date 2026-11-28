import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { BALANCE, page, PAYMENT, SESSIONS } from '@/earnings/testing/fixtures';
import { TeacherEarningsScreen } from './TeacherEarningsScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 't1' }),
}));
jest.mock('@/core/ui/form/ReceiptPicker', () => ({ ReceiptPicker: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.onRead(({ path: p }) =>
    Promise.resolve(
      p.includes('/sessions')
        ? page(SESSIONS)
        : p.includes('/payments')
          ? page([PAYMENT])
          : BALANCE,
    ),
  );
});

const rowFor = (label: string) =>
  screen.getByLabelText(new RegExp(`^${t.earnings.selectRow.split('{date}')[0]}${label}`));

test('the admin reads /teacher-earnings/:id and sees the balance of that teacher', async () => {
  await renderWithQuery(<TeacherEarningsScreen />);
  expect(await screen.findByText(/أبرار/)).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/teacher-earnings/t1' });
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
  mockApi.onWrite(() => ({ payment: PAYMENT, replayed: false }));
  await renderWithQuery(<TeacherEarningsScreen />);
  await screen.findByText(t.earnings.statusName.partially_paid);
  await fireEvent.press(screen.getAllByRole('checkbox')[1] as never);
  await fireEvent.press(screen.getByText(t.earnings.payChosen.replace('{count}', '1')));
  expect(screen.getByDisplayValue('60')).toBeTruthy();
  await fireEvent.changeText(screen.getByDisplayValue('60'), '25.5');
  await fireEvent.press(screen.getByText(t.enums.paymentMethod.cash));
  await fireEvent.press(screen.getByText(t.earnings.confirm));
  await waitFor(() => expect(mockApi.writes()).not.toHaveLength(0));
  expect(mockApi.writes()).toContainEqual({
    method: 'POST',
    path: '/teacher-earnings/t1/payments',
    body: expect.objectContaining({ amount: 25.5, method: 'cash', earningIds: ['e2'] }),
  });
  expect(await screen.findByText(t.earnings.saved)).toBeTruthy();
});

test('more than the ticked lesson owes is refused on the form and nothing is sent', async () => {
  await renderWithQuery(<TeacherEarningsScreen />);
  await screen.findByText(t.earnings.statusName.partially_paid);
  await fireEvent.press(screen.getAllByRole('checkbox')[1] as never);
  await fireEvent.press(screen.getByText(t.earnings.payChosen.replace('{count}', '1')));
  await fireEvent.changeText(screen.getByDisplayValue('60'), '60.01');
  await fireEvent.press(
    screen.getByText(t.payments.mobile.takePhoto === '' ? '' : t.enums.paymentMethod.bank),
  );
  await fireEvent.press(screen.getByText(t.earnings.confirm));
  expect(
    await screen.findByText(t.earnings.overpayment.replace('{amount}', '⁦60⁩ ج.م')),
  ).toBeTruthy();
  expect(mockApi.writes()).toHaveLength(0);
});
