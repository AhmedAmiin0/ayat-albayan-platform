import { fireEvent, screen } from '@testing-library/react-native';
import { cachedList, huda } from '@/inbox/shared/fixtures';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, SUN_17 } from './fixtures';
import { uploadInvoice } from './invoice-upload';
import { fakeBookingApi, LEADS_KEY, walkPackageToInvoice } from './test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/payments/receipt', () => ({ pickReceipt: jest.fn() }));
jest.mock('./invoice-upload', () => ({ uploadInvoice: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ leadId: 'a1', phone: '+966552147730', name: 'هدى سالم', mode: 'subscribe' }),
}));

const MEDIA = '/threads/%2B966552147730/media';
const MESSAGE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const press = async (name: string) => fireEvent.press(await screen.findByRole('button', { name }));

beforeEach(() => {
  jest.clearAllMocks();
  const api = fakeBookingApi();
  mockApiFetch.mockImplementation((path: string) =>
    path === MEDIA
      ? Promise.resolve([{ message_id: MESSAGE, created_at: '2026-10-02T10:00:00.000Z', mime: 'application/pdf', caption: 'تحويل بنكي', expired: false }])
      : api.fetch(path),
  );
});

test('the invoice saved from the guardian’s chat books by message id: nothing is uploaded from the phone', async () => {
  const client = createTestClientWithLead();
  await renderWithQuery(<BookTrialScreen />, client);
  await walkPackageToInvoice();
  await press(t.booking.invoice.fromChat);
  await fireEvent.press(await screen.findByText('تحويل بنكي'));
  expect(await screen.findByText(t.booking.mobile.pdfFile)).toBeTruthy(); // the picked PDF's tile
  await press(t.booking.next);
  expect(screen.getByText(t.booking.invoice.fromChat)).toBeTruthy(); // the review row

  mockApiSend.mockResolvedValue(booked(SUN_17));
  await press(t.booking.submit);
  await screen.findByText(t.booking.booked);
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({
    kind: 'package',
    invoice: { source: 'whatsapp', messageId: MESSAGE },
  });
  expect(uploadInvoice).not.toHaveBeenCalled();
  expect(client.getQueryData(['leads', 'a1'])).toMatchObject({ status: 'converted' });
});

test('WhatsApp no longer has the file (410 media_expired): back to «الفاتورة» to pick another', async () => {
  await renderWithQuery(<BookTrialScreen />, createTestClientWithLead());
  await walkPackageToInvoice();
  await press(t.booking.invoice.fromChat);
  await fireEvent.press(await screen.findByText('تحويل بنكي'));
  await press(t.booking.next);
  mockApiSend.mockRejectedValue(new ApiError(410, { code: 'media_expired' }));
  await press(t.booking.submit);
  expect(await screen.findByText(t.booking.error.media_expired)).toBeTruthy();
  await press(t.booking.invoice.replace);
  expect(await screen.findByText(t.booking.invoice.hint)).toBeTruthy();
});

function createTestClientWithLead() {
  const client = createTestQueryClient();
  client.setQueryData(LEADS_KEY, cachedList([{ ...huda, status: 'trial_done' }]));
  return client;
}
