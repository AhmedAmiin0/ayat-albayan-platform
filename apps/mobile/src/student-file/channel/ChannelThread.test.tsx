import type { ChannelPage } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChannelThread } from './ChannelThread';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const c = t.studentChannel;
const page = (over: Partial<ChannelPage> = {}): ChannelPage => ({
  student_name: 'سلمى',
  messages: [
    { id: 'm1', body: 'متى الحلقة؟ https://example.org/plan', sender_role: 'guardian', sender_name: 'أم سلمى', mine: false, created_at: '2026-10-27T10:00:00.000Z' },
    { id: 'm2', body: 'غدًا إن شاء الله', sender_role: 'teacher', sender_name: 'أبرار', mine: true, created_at: '2026-10-27T10:05:00.000Z' },
  ],
  has_more: false,
  read_only: false,
  open: true,
  channel_id: '',
  ...over,
});

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(page());
  mockApiSend.mockReset().mockResolvedValue({});
});

test('a participant reads oldest first with links clickable, writes, and marks the thread read', async () => {
  await renderWithQuery(<ChannelThread refs={{ audience: 'teacher', studentId: 's1' }} />);
  expect(await screen.findByText(/متى الحلقة؟/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'https://example.org/plan' })).toBeTruthy();
  expect(screen.getByText(c.you)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/channels/s1/messages');
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/teachers/me/channels/s1/read', { at: '2026-10-27T10:05:00.000Z' }));
  await fireEvent.changeText(screen.getByLabelText(c.messageLabel), '  شكرًا  ');
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/teachers/me/channels/s1/messages', { body: 'شكرًا' }));
  expect(screen.queryByText(c.readOnly)).toBeNull();
});

test('a monitor reads with «للاطلاع فقط», no composer, and never marks anything read', async () => {
  mockApiFetch.mockResolvedValue(page({ read_only: true }));
  await renderWithQuery(<ChannelThread refs={{ audience: 'admin', studentId: 's1' }} />);
  expect(await screen.findByText(c.readOnly)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/channel/messages');
  expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('an empty channel says so; a failed send says so and keeps the text', async () => {
  mockApiFetch.mockResolvedValue(page({ messages: [] }));
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path.endsWith('/messages')) throw new Error('down');
    return {};
  });
  await renderWithQuery(<ChannelThread refs={{ audience: 'sales', studentId: 's1' }} />);
  expect(await screen.findByText(c.empty)).toBeTruthy();
  expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
});

test('a load error offers a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('down'));
  await renderWithQuery(<ChannelThread refs={{ audience: 'teacher', studentId: 's1' }} />);
  expect(await screen.findByText(c.loadFailed)).toBeTruthy();
});
