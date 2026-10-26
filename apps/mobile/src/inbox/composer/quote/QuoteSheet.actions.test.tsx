import { offerText } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Clipboard } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { bulkSa } from '@/finance/pricing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { getComposerText, setComposerText } from '../draft-store';
import { QuoteSheet } from './QuoteSheet';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const PHONE = '+966501234567';
const TEXT = offerText(bulkSa, ar.pricing);
const q = t.inbox.quote;
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(bulkSa);
  mockApiSend.mockReset();
  setComposerText(PHONE, '');
});

async function sheet(open = true) {
  const onClose = jest.fn();
  await renderWithQuery(<QuoteSheet phone={PHONE} open={open} onClose={onClose} />);
  await screen.findByTestId('quote-preview');
  return onClose;
}

test('«أرسل العرض» posts the offer once through the chat text route, even on a double tap', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await sheet();
  const send = button(q.send);
  await fireEvent.press(send);
  await fireEvent.press(send);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(await screen.findByRole('button', { name: t.inbox.composer.sending })).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  const [method, path, body] = mockApiSend.mock.calls[0] as [string, string, { text: string; clientRequestId: string }];
  expect([method, path, body.text]).toEqual(['POST', `/threads/${encodeURIComponent(PHONE)}/text`, TEXT]);
  expect(body.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
});

test('a sent offer closes the sheet; another tap later is a new request id', async () => {
  mockApiSend.mockImplementation(async (_m: string, _p: string, b: { text: string }) => ({ id: 'm1', body: b.text }));
  const onClose = await sheet();
  await fireEvent.press(button(q.send));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  await fireEvent.press(await screen.findByRole('button', { name: q.send }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  expect(mockApiSend).toHaveBeenCalledTimes(2);
  const ids = mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(new Set(ids).size).toBe(ids.length);
});

test('«عدّل قبل الإرسال» puts the offer in the box (after what was typed) and sends nothing', async () => {
  setComposerText(PHONE, 'مرحبًا');
  const onClose = await sheet();
  await fireEvent.press(button(q.edit));
  expect(getComposerText(PHONE)).toBe(`مرحبًا\n${TEXT}`);
  expect(onClose).toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('outside the 24 h window: send and edit are disabled with the closed note; copy still shares the text', async () => {
  const copy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => undefined);
  await sheet(false);
  expect(screen.getByTestId('closed-note')).toBeTruthy();
  expect(button(q.send).props.accessibilityState.disabled).toBe(true);
  expect(button(q.edit).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(button(q.copy));
  expect(copy).toHaveBeenCalledWith(TEXT);
  expect(await screen.findByText(q.copied)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a sheet reopened while its send is in flight cannot send again, and cannot be dismissed meanwhile', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  const client = createTestQueryClient();
  const onClose = jest.fn();
  const first = await renderWithQuery(<QuoteSheet phone={PHONE} open onClose={onClose} />, client);
  await screen.findByTestId('quote-preview');
  await fireEvent.press(button(q.send));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(1));
  // The press lands once the sheet shows the send in flight (useIsMutating re-renders async).
  await screen.findByRole('button', { name: t.inbox.composer.sending });
  await fireEvent.press(screen.getByRole('button', { name: q.close }));
  expect(onClose).not.toHaveBeenCalled();
  await first.unmount();
  await renderWithQuery(<QuoteSheet phone={PHONE} open onClose={onClose} />, client);
  await screen.findByTestId('quote-preview');
  expect(screen.getByRole('button', { name: t.inbox.composer.sending }).props.accessibilityState.disabled).toBe(true);
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});
