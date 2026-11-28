import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t, ltr } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { balanceOf, payment, subscription } from '@/payments/fixtures';
import { PaymentScreen } from '@/payments/screens/PaymentScreen/PaymentScreen';
import { mockCall } from '@ab/testing/mock-call';

// An underpayment leaves the package unpaid; the admin is told, never stopped.
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canDismiss: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('expo-image-picker', () => ({}));

const shortBy = (n: string) =>
  t.packagePayment.shortfall
    .replace('{amount}', ltr(n))
    .replace('{currency}', t.pricing.currencies.SAR);

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.onRead(() => balanceOf(subscription({ price: 81, paid: 0 })));
  mockApi.onWrite(() => payment());
});

test('81 covers it: no note', async () => {
  await renderWithQuery(<PaymentScreen />);
  await fireEvent.changeText(await screen.findByLabelText(t.payments.amount), '81');
  expect(screen.queryByText(/أقل من المستحق/)).toBeNull();
});

test('80 against 81 due: the note, and «سجّل دفعة» still records it', async () => {
  await renderWithQuery(<PaymentScreen />);
  await fireEvent.changeText(await screen.findByLabelText(t.payments.amount), '80');
  expect(screen.getByText(shortBy('1'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.cash }));
  await fireEvent.press(screen.getByRole('button', { name: t.payments.mobile.record }));
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/payments',
      body: expect.objectContaining({ amount: 80 }),
    }),
  );
});
