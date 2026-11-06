import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, message, thread } from '@/inbox/shared/thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

// docs/44 BUG7 on the chat screen: a send with no answer keeps its bubble «unconfirmed», says so
// under the box with the text back in it, and the retry of an EDITED text reuses the same id.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const openThread = detail([inbound], { thread: { ...thread, last_inbound_at: minutesAgo(5) } });
const gate = { open: true, reason: null, queued: 0 };
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);
const send = () => fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
const ids = () =>
  mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);

test('no answer: «unconfirmed» bubble, the text back, and an edited retry is the same send', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/messages/gate' ? gate : openThread);
  mockApiSend.mockRejectedValue(new TypeError('Network request failed'));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
  await fireEvent.changeText(box(), 'تمام');
  await send();
  expect(await screen.findByText(t.inbox.error.send_unconfirmed)).toBeTruthy();
  expect(screen.getByText(t.messages.sendUnconfirmed)).toBeTruthy();
  expect(box().props.value).toBe('تمام');

  mockApiSend.mockResolvedValue(message({ id: 'srv', body: 'تمام', status: 'sent' }));
  await fireEvent.changeText(box(), 'تمام، شكرًا');
  await send();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect(ids()[1]).toBe(ids()[0]);
  await waitFor(() => expect(screen.queryByText(t.messages.sendUnconfirmed)).toBeNull());
});
