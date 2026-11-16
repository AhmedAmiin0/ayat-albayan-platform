import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../testing/query';
import type { ChannelRef } from './channel-api';
import { ChannelThread } from './ChannelThread';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const c = t.studentChannel;
const message = (over: Partial<ChannelMessageView>): ChannelMessageView => ({
  ...{ id: 'm1', body: '', sender_role: 'guardian', sender_name: 'أم سلمى', mine: false },
  ...{ created_at: '2026-10-27T10:00:00.000Z', edited: false, deleted: false },
  ...over,
});
const page = (over: Partial<ChannelPage> = {}): ChannelPage => ({
  student_name: 'سلمى',
  messages: [
    message({ body: 'متى الحلقة؟ https://example.org/plan' }),
    message({
      ...{ id: 'm2', body: 'غدًا إن شاء الله', sender_role: 'teacher', sender_name: 'أبرار' },
      ...{ mine: true, created_at: '2026-10-27T10:05:00.000Z' },
    }),
  ],
  has_more: false,
  read_only: false,
  open: true,
  channel_id: '',
  ...over,
});
const thread = (refs: ChannelRef) =>
  renderWithQuery(<ChannelThread refs={refs} />, freshQueryClient());

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(page());
  mockApiSend.mockReset().mockResolvedValue({});
});

test('a participant reads oldest first, links clickable, writes and marks it read', async () => {
  await thread({ audience: 'teacher', studentId: 's1' });
  expect(await screen.findByText(/متى الحلقة؟/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'https://example.org/plan' })).toBeTruthy();
  expect(screen.getByText(c.you)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/channels/s1/messages');
  const read = { at: '2026-10-27T10:05:00.000Z' };
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/teachers/me/channels/s1/read', read),
  );
  await fireEvent.changeText(screen.getByLabelText(c.messageLabel), '  شكرًا  ');
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  const path = '/teachers/me/channels/s1/messages';
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', path, { body: 'شكرًا' }));
  expect(screen.queryByText(c.readOnly)).toBeNull();
});

test('a monitor reads with «للاطلاع فقط», no composer, and never marks it read', async () => {
  mockApiFetch.mockResolvedValue(page({ read_only: true }));
  await thread({ audience: 'admin', studentId: 's1' });
  expect(await screen.findByText(c.readOnly)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/channel/messages');
  expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('an empty channel says so', async () => {
  mockApiFetch.mockResolvedValue(page({ messages: [] }));
  await thread({ audience: 'sales', studentId: 's1' });
  expect(await screen.findByText(c.empty)).toBeTruthy();
  expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
});

test('a failed send says so and keeps the text', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path.endsWith('/messages')) throw new Error('down');
    return {};
  });
  await thread({ audience: 'portal', studentId: 's1' });
  await fireEvent.changeText(await screen.findByLabelText(c.messageLabel), 'السلام عليكم');
  expect(mockApiFetch).toHaveBeenCalledWith('/portal/students/s1/channel/messages');
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  expect(await screen.findByText(c.sendFailed)).toBeTruthy();
  expect(screen.getByDisplayValue('السلام عليكم')).toBeTruthy();
});

test('a load error offers a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('down'));
  await thread({ audience: 'teacher', studentId: 's1' });
  expect(await screen.findByText(c.loadFailed)).toBeTruthy();
});
