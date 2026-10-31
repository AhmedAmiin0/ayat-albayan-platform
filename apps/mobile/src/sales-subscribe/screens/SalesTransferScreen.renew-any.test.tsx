import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { chatImage, familyOf, KID, kid, MSG, openSub, salesPayment, SUB } from '../testing/fixtures';
import { SalesTransferScreen } from './SalesTransferScreen';

// sales.renew_any (owner 2026-10-29, docs/16 row 38): a child of the chat's family that is not hers (mine: false).
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));
jest.mock('expo-image-picker', () => ({}));

const CHAT = '+966501112223';
const m = t.salesMoney;
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/payments/receipt-from-chat' ? { receipt_path: `${SUB}/c.jpg` } : salesPayment('active'),
  );
});

test('not hers: the transfer and the chat receipts carry the chat phone; «إلغاء الباقة» is not offered', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/sales/money/family')) return familyOf(kid({ mine: false, open: [openSub()] }));
    if (path.startsWith('/sales/money/chat-receipts/')) return { url: 'https://x/t.jpg', expires_at: '', mime: 'image/jpeg' };
    return path.startsWith('/sales/money/chat-receipts') ? [chatImage] : {};
  });
  await renderWithQuery(<SalesTransferScreen />);
  expect(await screen.findByLabelText(t.payments.amount)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: m.receiptFromChat }));
  expect(mockApiFetch).toHaveBeenCalledWith(`/sales/money/chat-receipts?studentId=${KID}&phone=${encodeURIComponent(CHAT)}`);
  await fireEvent.press(await screen.findByRole('button', { name: `${instantDay(chatImage.created_at, 'Asia/Riyadh')} · ${chatImage.caption ?? ''}` }));
  await waitFor(() => expect(sent('/sales/payments/receipt-from-chat')[0]?.[2]).toEqual({ subscriptionId: SUB, messageId: MSG, phone: CHAT }));
  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  await waitFor(() => expect(sent('/sales/payments')[0]?.[2]).toMatchObject({ subscriptionId: SUB, phone: CHAT }));
});

test('hers (mine: true): the bodies stay as they were (no phone) and «إلغاء الباقة» is offered', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/sales/money/family') ? familyOf(kid({ mine: true, open: [openSub()] })) : {},
  );
  await renderWithQuery(<SalesTransferScreen />);
  expect(await screen.findByRole('button', { name: t.subscriptions.cancel.action })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  await waitFor(() => expect(sent('/sales/payments')).toHaveLength(1));
  expect(sent('/sales/payments')[0]?.[2]).not.toHaveProperty('phone');
});
