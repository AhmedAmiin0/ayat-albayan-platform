import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub } from '../testing/fixtures';
import { SalesTransferScreen } from './SalesTransferScreen';

// «إلغاء الباقة» from her transfer screen (owner 2026-10-28): her package made by mistake, nothing paid.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));
jest.mock('expo-image-picker', () => ({}));

beforeEach(() => mockApiSend.mockReset().mockResolvedValue({}));

test('nothing paid: «إلغاء الباقة» → confirm → POST /sales/subscriptions/:id/cancel', async () => {
  const sub = openSub({ paid: 0 });
  mockApiFetch.mockResolvedValue(familyOf(kid({ open: [sub] })));
  await renderWithQuery(<SalesTransferScreen />);
  await screen.findByText(t.subscriptions.cancel.action);
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.action }));
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.confirm }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', `/sales/subscriptions/${sub.id}/cancel`, {}));
});

test('part paid: no cancel offered', async () => {
  mockApiFetch.mockResolvedValue(familyOf(kid({ open: [openSub({ paid: 100 })] })));
  await renderWithQuery(<SalesTransferScreen />);
  expect(await screen.findByText(t.salesMoney.saveTransfer)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
});
