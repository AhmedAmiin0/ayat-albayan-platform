import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { instantDay } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { chatImage, expiredImage, familyOf, KID, kid, MSG, openSub, salesPayment, SUB } from './fixtures';
import { SalesTransferScreen } from './SalesTransferScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: (h: string) => mockPush(h), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223', subscriptionId: '88888888-8888-4888-8888-888888888888' }),
}));
jest.mock('expo-image-picker', () => ({}));

const m = t.salesMoney;
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const PATH = `${SUB}/chat-1.jpg`;

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

test('no receipt yet: «سجّل التحويل» says it is required and sends nothing', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  expect(await screen.findByLabelText(t.payments.amount)).toHaveProp('value', '180');
  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  expect(await screen.findByText(m.receiptRequired)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a receipt from the chat → receipt-from-chat → POST /sales/payments with its path, no kind/method → «أصبح الطالب مشتركًا»', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: m.receiptFromChat }));
  expect(mockApiFetch).toHaveBeenCalledWith(`/sales/money/chat-receipts?studentId=${KID}`);
  const name = `${instantDay(chatImage.created_at)} · ${chatImage.caption ?? ''}`;
  const expired = await screen.findByRole('button', { name: new RegExp(m.receiptExpired) });
  expect(expired).toBeDisabled();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(`/sales/money/chat-receipts/${MSG}?studentId=${KID}`));
  await fireEvent.press(screen.getByRole('button', { name }));
  expect(await screen.findByText(m.receiptChosen)).toBeTruthy();
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
    receiptPath: PATH,
    note: 'تحويل الراجحي',
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
  expect(body).not.toHaveProperty('kind');
  expect(body).not.toHaveProperty('method');
  await fireEvent.press(screen.getByRole('button', { name: m.openMyPayments }));
  expect(mockPush).toHaveBeenCalledWith('/more/sales/earnings?view=payments');
  await fireEvent.press(screen.getByRole('button', { name: m.done }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('an expired chat file (410): the reason, nothing chosen', async () => {
  const { ApiError } = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  mockApiSend.mockRejectedValue(new ApiError(410, { code: 'media_expired' }));
  await renderWithQuery(<SalesTransferScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: m.receiptFromChat }));
  await fireEvent.press(await screen.findByRole('button', { name: `${instantDay(chatImage.created_at)} · ${chatImage.caption ?? ''}` }));
  expect(await screen.findByText(m.error.media_expired)).toBeTruthy();
  expect(screen.queryByText(m.receiptChosen)).toBeNull();
});
