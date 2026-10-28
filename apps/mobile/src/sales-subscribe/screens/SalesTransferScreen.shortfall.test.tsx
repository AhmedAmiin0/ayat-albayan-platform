import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { salesPayment, SUB } from '../testing/fixtures';
import { SalesTransferScreen } from './SalesTransferScreen';

// Owner 2026-10-28: a transfer of 80 on a package of 81 leaves it «غير مدفوعة»; she is told before saving.
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => {
  const f = jest.requireActual('../testing/fixtures');
  return {
    ...jest.requireActual('@/core/lib/http/api'),
    apiFetch: async () => f.familyOf(f.kid({ open: [f.openSub({ price: 81, due: 81 })] })),
    apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
  };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));
jest.mock('expo-image-picker', () => ({}));

const shortBy = (n: string) => t.packagePayment.shortfall.replace('{amount}', ltr(n)).replace('{currency}', t.pricing.currencies.SAR);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(salesPayment('trial'));
});

test('the due prefilled covers it: no note; 80 against 81: the note, and saving still goes', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  const amount = await screen.findByLabelText(t.payments.amount);
  expect(amount).toHaveProp('value', '81');
  expect(screen.queryByText(shortBy('1'))).toBeNull();
  await fireEvent.changeText(amount, '80');
  expect(screen.getByText(shortBy('1'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.salesMoney.saveTransfer }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/payments', expect.objectContaining({ subscriptionId: SUB, amount: 80 })),
  );
});
