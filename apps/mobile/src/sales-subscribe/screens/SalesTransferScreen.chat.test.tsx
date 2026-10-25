import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { chatImage, expiredImage, familyOf, KID, kid, MSG, openSub, salesPayment, SUB } from '../testing/fixtures';
import { SalesTransferScreen } from './SalesTransferScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: (h: string) => mockPush(h),
    dismissTo: (h: string) => mockDismissTo(h),
    canGoBack: () => true,
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ phone: '+966501112223', subscriptionId: '88888888-8888-4888-8888-888888888888' }),
}));
jest.mock('expo-image-picker', () => ({}));

const m = t.salesMoney;
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const PATH = `${SUB}/chat-1.jpg`;
const FIRST = m.attachmentN.replace('{n}', '1');

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-12T09:00:00Z'), advanceTimers: true });
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/sales/money/family')) return familyOf(kid({ open: [openSub()] }));
    if (path.startsWith(`/sales/money/chat-receipts/${MSG}`)) return { url: 'https://x/t.jpg', expires_at: '', mime: 'image/jpeg' };
    if (path.startsWith('/sales/money/chat-receipts')) return [chatImage, expiredImage];
    return {};
  });
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/payments/receipt-from-chat' ? { receipt_path: PATH } : salesPayment('active'),
  );
});
afterEach(() => jest.useRealTimers());

test('no attachment (optional now): «سجّل التحويل» posts without attachments or receiptPath', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  expect(await screen.findByLabelText(t.payments.amount)).toHaveProp('value', '180');
  expect(screen.getByText(m.attachments)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  expect(await screen.findByText(m.becameSubscribed)).toBeTruthy();
  const body = sent('/sales/payments')[0]?.[2];
  expect(body).toMatchObject({ subscriptionId: SUB, amount: 180, currency: 'SAR' });
  expect(body).not.toHaveProperty('attachments');
  expect(body).not.toHaveProperty('receiptPath');
});

test('a file from the chat → receipt-from-chat → POST /sales/payments with it in attachments, no kind/method → «أصبح الطالب مشتركًا»', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: m.receiptFromChat }));
  expect(mockApiFetch).toHaveBeenCalledWith(`/sales/money/chat-receipts?studentId=${KID}`);
  const name = `${instantDay(chatImage.created_at)} · ${chatImage.caption ?? ''}`;
  const expired = await screen.findByRole('button', { name: new RegExp(m.receiptExpired) });
  expect(expired).toBeDisabled();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(`/sales/money/chat-receipts/${MSG}?studentId=${KID}`));
  await fireEvent.press(screen.getByRole('button', { name }));
  expect(await screen.findByText(FIRST)).toBeTruthy();
  expect(sent('/sales/payments/receipt-from-chat')[0]?.[2]).toEqual({ subscriptionId: SUB, messageId: MSG });

  await fireEvent.changeText(screen.getByLabelText(m.note), 'تحويل الراجحي');
  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  expect(await screen.findByText(m.becameSubscribed)).toBeTruthy();
  const body = sent('/sales/payments')[0]?.[2];
  expect(body).toEqual({
    subscriptionId: SUB,
    amount: 180,
    currency: 'SAR',
    paidAt: '2026-10-12T09:00:00.000Z',
    attachments: [PATH],
    note: 'تحويل الراجحي',
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
  expect(body).not.toHaveProperty('kind');
  expect(body).not.toHaveProperty('method');
  await fireEvent.press(screen.getByRole('button', { name: m.openMyPayments }));
  // A tab's screen from the chat group: back down to the tabs, not a second tab host pushed on top.
  expect(mockDismissTo).toHaveBeenCalledWith('/more/sales/earnings?view=payments');
  expect(mockPush).not.toHaveBeenCalledWith('/more/sales/earnings?view=payments');
  await fireEvent.press(screen.getByRole('button', { name: m.done }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('an expired chat file (410): the reason, nothing chosen', async () => {
  const { ApiError } = jest.requireActual<typeof import('@/core/lib/http/api')>('@/core/lib/http/api');
  mockApiSend.mockRejectedValue(new ApiError(410, { code: 'media_expired' }));
  await renderWithQuery(<SalesTransferScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: m.receiptFromChat }));
  await fireEvent.press(await screen.findByRole('button', { name: `${instantDay(chatImage.created_at)} · ${chatImage.caption ?? ''}` }));
  expect(await screen.findByText(m.error.media_expired)).toBeTruthy();
  expect(screen.queryByText(FIRST)).toBeNull();
});

test('the same chat message picked again: no second copy, still one attachment', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  const name = `${instantDay(chatImage.created_at)} · ${chatImage.caption ?? ''}`;
  await fireEvent.press(await screen.findByRole('button', { name: m.receiptFromChat }));
  await fireEvent.press(await screen.findByRole('button', { name }));
  expect(await screen.findByText(FIRST)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: m.receiptFromChat }));
  await fireEvent.press(await screen.findByRole('button', { name }));
  expect(sent('/sales/payments/receipt-from-chat')).toHaveLength(1);
  expect(screen.queryByText(m.attachmentN.replace('{n}', '2'))).toBeNull();
});
