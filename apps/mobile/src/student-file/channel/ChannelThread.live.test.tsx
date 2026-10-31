import type { ChannelPage } from '@ab/shared';
import { act, screen, waitFor } from '@testing-library/react-native';
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
/** A fake Supabase Realtime channel: the test fires the join and an insert. */
const mockRt: { filter?: unknown; insert?: () => void; status?: (s: string) => void; channel: jest.Mock; remove: jest.Mock } = {
  channel: jest.fn(),
  remove: jest.fn(async () => 'ok'),
};
jest.mock('@/core/lib/http/supabase', () => {
  const ch = {
    on: (_t: string, filter: unknown, cb: () => void) => Object.assign(mockRt, { filter, insert: cb }) && ch,
    subscribe: (cb: (s: string) => void) => Object.assign(mockRt, { status: cb }) && ch,
  };
  const channel = (topic: string) => {
    mockRt.channel(topic);
    return ch;
  };
  return { supabase: { channel, removeChannel: () => mockRt.remove() } };
});

const c = t.studentChannel;
const page = (over: Partial<ChannelPage> = {}): ChannelPage => ({
  student_name: 'سلمى',
  messages: [{ id: 'm1', body: 'السلام عليكم', sender_role: 'guardian', sender_name: 'أم سلمى', mine: false, created_at: '2026-10-27T10:00:00.000Z', edited: false, deleted: false }],
  has_more: false,
  read_only: false,
  open: true,
  channel_id: 'c1',
  ...over,
});

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset().mockResolvedValue({});
  mockRt.channel.mockClear();
});

test('closed (before the subscription and the assignment): the closed line, no composer, no socket', async () => {
  mockApiFetch.mockResolvedValue(page({ open: false, messages: [] }));
  await renderWithQuery(<ChannelThread refs={{ audience: 'teacher', studentId: 's1' }} />);
  expect(await screen.findByText(c.closed)).toBeTruthy();
  expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
  expect(mockRt.channel).not.toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('open: the composer; the socket joins this channel and an insert re-reads the thread', async () => {
  mockApiFetch.mockResolvedValue(page());
  await renderWithQuery(<ChannelThread refs={{ audience: 'teacher', studentId: 's1' }} />);
  expect(await screen.findByLabelText(c.messageLabel)).toBeTruthy();
  await waitFor(() => expect(mockRt.channel).toHaveBeenCalled());
  expect(mockRt.filter).toMatchObject({ table: 'channel_messages', filter: 'channel_id=eq.c1' });
  await act(async () => mockRt.status?.('SUBSCRIBED'));
  const before = mockApiFetch.mock.calls.length;
  await act(async () => mockRt.insert?.());
  await waitFor(() => expect(mockApiFetch.mock.calls.length).toBeGreaterThan(before));
});

test('a monitor of a closed channel still reads, told why the others cannot write', async () => {
  mockApiFetch.mockResolvedValue(page({ open: false, read_only: true }));
  await renderWithQuery(<ChannelThread refs={{ audience: 'admin', studentId: 's1' }} />);
  expect(await screen.findByText(`${c.readOnly} ${c.closedMonitor}`)).toBeTruthy();
  expect(screen.getByText('السلام عليكم')).toBeTruthy();
});
