import { priceList, priceListText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
const mockCopy = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/clipboard', () => ({
  copyOrShare: (mockText: string) => mockCopy(mockText),
}));

const PHONE = '+966501234567';
const LIST = { ...priceList({ country: 'SA', students: 1, discount: 0 }), fx: null };
const TEXT = priceListText(LIST, ar.pricing);
const q = t.inbox.quote;
const button = (name: string) => screen.getByRole('button', { name });
const off = (name: string) => button(name).props.accessibilityState?.disabled;
const preview = () => screen.getByTestId('quote-preview').props.children as string;

beforeEach(() => {
  const answer = async (path: string) => (path.startsWith('/pricing/list') ? LIST : bulkSa);
  mockApiFetch.mockReset().mockImplementation(answer);
  mockApiSend.mockReset();
  mockCopy.mockReset().mockResolvedValue('copied');
  setComposerText(PHONE, '');
});

async function listSheet(open = true) {
  const onClose = jest.fn();
  await renderWithQuery(<QuoteSheet phone={PHONE} open={open} onClose={onClose} />);
  await screen.findByTestId('quote-preview');
  await fireEvent.press(screen.getByRole('radio', { name: q.mode.all }));
  await waitFor(() => expect(preview()).toBe(TEXT));
  return onClose;
}

test('«أرسل العرض» posts the whole list as one chat text and closes the sheet', async () => {
  mockApiSend.mockImplementation(async (_m: string, _p: string, b: { text: string }) => ({
    id: 'm1',
    body: b.text,
  }));
  const onClose = await listSheet();
  await fireEvent.press(button(q.send));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  const [method, path, body] = mockApiSend.mock.calls[0] as [string, string, { text: string }];
  expect([method, path]).toEqual(['POST', `/threads/${encodeURIComponent(PHONE)}/text`]);
  expect(body.text).toBe(TEXT);
});

test('«عدّل قبل الإرسال» puts the list in the box (after what was typed) and sends nothing', async () => {
  setComposerText(PHONE, 'مرحبًا');
  const onClose = await listSheet();
  await fireEvent.press(button(q.edit));
  expect(getComposerText(PHONE)).toBe(`مرحبًا\n${TEXT}`);
  expect(onClose).toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«انسخ» copies the list text and says so; a failed copy says that instead', async () => {
  await listSheet();
  await fireEvent.press(button(q.copy));
  expect(mockCopy).toHaveBeenCalledWith(TEXT);
  expect(await screen.findByText(q.copied)).toBeTruthy();
  mockCopy.mockResolvedValue('failed');
  await fireEvent.press(button(q.copy));
  expect(await screen.findByText(q.copyFailed)).toBeTruthy();
  expect(screen.queryByText(q.copied)).toBeNull();
});

test('outside the 24 h window the list cannot be sent or put in the box; copy stays', async () => {
  await listSheet(false);
  expect(screen.getByTestId('closed-note')).toBeTruthy();
  expect(off(q.send)).toBe(true);
  expect(off(q.edit)).toBe(true);
  await fireEvent.press(button(q.send));
  await fireEvent.press(button(q.copy));
  expect(mockCopy).toHaveBeenCalledWith(TEXT);
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(getComposerText(PHONE)).toBe('');
});
