import type { ChannelPage } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { FamilyChatScreen } from './FamilyChatScreen';

const mockFetch = jest.fn();
const mockSend = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

const c = t.studentChannel;
const page: ChannelPage = {
  student_name: 'سارة',
  messages: [
    {
      ...{ id: 'm1', body: 'السلام عليكم', sender_role: 'teacher', sender_name: 'فاطمة' },
      ...{ mine: false, created_at: '2026-11-16T10:00:00.000Z', edited: false, deleted: false },
      ...{ kind: 'text', attachment: null, reply_to: null, read_by_all: false, client_id: null },
    },
  ],
  has_more: false,
  read_only: false,
  open: true,
  closed_reason: null,
  channel_id: '',
};
const PRESENCE = { enabled: false, peers: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockImplementation(async (path: string) =>
    path.endsWith('/presence') ? PRESENCE : page,
  );
  mockSend.mockResolvedValue({});
});

test("a guardian's chat: the child's thread on the portal routes, and a reply", async () => {
  await renderWithQuery(<FamilyChatScreen />, freshQueryClient());
  expect(await screen.findByText('السلام عليكم')).toBeTruthy();
  expect(screen.getByText(`${c.portalTab} · سارة`)).toBeTruthy();
  expect(screen.getByTestId('channel-people')).toHaveTextContent(`فاطمة${c.namesJoin}${c.you}`);
  expect(mockFetch).toHaveBeenCalledWith('/portal/students/s1/channel/messages');
  await fireEvent.changeText(screen.getByLabelText(c.messageLabel), 'جزاكم الله خيرًا');
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  const path = '/portal/students/s1/channel/messages';
  const body = expect.objectContaining({ body: 'جزاكم الله خيرًا', client_id: expect.any(String) });
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith('POST', path, body));
});

test('refused by the API (the chat off): the load error, no composer', async () => {
  mockFetch.mockRejectedValue(new Error('403'));
  await renderWithQuery(<FamilyChatScreen />, freshQueryClient());
  expect(await screen.findByText(c.loadFailed)).toBeTruthy();
  expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
});

test('no media port in the family app yet: no attach and no microphone', async () => {
  await renderWithQuery(<FamilyChatScreen />, freshQueryClient());
  expect(await screen.findByText('السلام عليكم')).toBeTruthy();
  expect(screen.queryByLabelText(c.media.attach)).toBeNull();
  expect(screen.queryByLabelText(c.media.record)).toBeNull();
});
