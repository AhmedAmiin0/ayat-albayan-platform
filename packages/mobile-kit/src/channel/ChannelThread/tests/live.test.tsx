import type { ChannelPage } from '@ab/shared';
import { act, screen, waitFor } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import type { ChannelRef } from '../../channel-api';
import { ChannelThread } from '../ChannelThread';
import { channelMessage, channelPage } from '../../testing/channel-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
/** A fake Supabase Realtime channel: the test fires the join and an insert. */
interface MockRealtime {
  filter?: unknown;
  insert?: () => void;
  status?: (s: string) => void;
  channel: jest.Mock;
  remove: jest.Mock;
}
const mockRt: MockRealtime = { channel: jest.fn(), remove: jest.fn(async () => 'ok') };
jest.mock('../../../lib/http/supabase', () => {
  const ch = {
    on: (_t: string, filter: unknown, cb: () => void) => {
      Object.assign(mockRt, { filter, insert: cb });
      return ch;
    },
    subscribe: (cb: (s: string) => void) => {
      Object.assign(mockRt, { status: cb });
      return ch;
    },
  };
  const channel = (topic: string) => {
    mockRt.channel(topic);
    return ch;
  };
  return { supabase: { channel, removeChannel: () => mockRt.remove() } };
});

const c = t.studentChannel;
const page = (over: Partial<ChannelPage> = {}): ChannelPage =>
  channelPage({
    messages: [channelMessage({ body: 'السلام عليكم' })],
    channel_id: 'c1',
    ...over,
  });
const thread = (refs: ChannelRef) =>
  renderWithQuery(<ChannelThread refs={refs} />, freshQueryClient());

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset().mockResolvedValue({});
  mockRt.channel.mockClear();
});

test('closed (no subscription or teacher yet): the closed line and no socket', async () => {
  mockApiFetch.mockResolvedValue(page({ open: false, messages: [] }));
  await thread({ audience: 'teacher', studentId: 's1' });
  expect(await screen.findByText(c.closedCard.title)).toBeTruthy();
  expect(screen.getByText(c.closedCard.body)).toBeTruthy();
  expect(
    screen.getByLabelText(
      `${c.closedCard.steps.subscribe}، ${c.closedCard.current}، ${c.closedCard.notes.subscribe}`,
    ),
  ).toBeTruthy();
  expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
  expect(mockRt.channel).not.toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('open: the composer; the socket joins this channel and an insert re-reads it', async () => {
  mockApiFetch.mockResolvedValue(page());
  await thread({ audience: 'teacher', studentId: 's1' });
  expect(await screen.findByLabelText(c.messageLabel)).toBeTruthy();
  await waitFor(() => expect(mockRt.channel).toHaveBeenCalled());
  const filter = { table: 'channel_messages', filter: 'channel_id=eq.c1' };
  expect(mockRt.filter).toMatchObject(filter);
  await act(async () => mockRt.status?.('SUBSCRIBED'));
  const before = mockApiFetch.mock.calls.length;
  await act(async () => mockRt.insert?.());
  await waitFor(() => expect(mockApiFetch.mock.calls.length).toBeGreaterThan(before));
});

test('a monitor of a closed channel still reads, told why the others cannot write', async () => {
  mockApiFetch.mockResolvedValue(page({ open: false, read_only: true }));
  await thread({ audience: 'admin', studentId: 's1' });
  expect(await screen.findByText(`${c.readOnly} ${c.closedMonitor}`)).toBeTruthy();
  expect(screen.getByText('السلام عليكم')).toBeTruthy();
});

test('the closed card follows the reason: no teacher yet → subscribed, the teacher is next', async () => {
  const closed = page({ open: false, messages: [], closed_reason: 'no_teacher' });
  mockApiFetch.mockResolvedValue(closed);
  await thread({ audience: 'portal', studentId: 's1' });
  const steps = c.closedCard.steps;
  expect(await screen.findByLabelText(`${steps.subscribe}، ${c.closedCard.done}`)).toBeTruthy();
  const teacher = `${steps.teacher}، ${c.closedCard.current}، ${c.closedCard.notes.teacher}`;
  expect(screen.getByLabelText(teacher)).toBeTruthy();
});

test('the chat switched off for the family: the title only, no steps', async () => {
  const closed = page({ open: false, messages: [], closed_reason: 'family_chat_off' });
  mockApiFetch.mockResolvedValue(closed);
  await thread({ audience: 'portal', studentId: 's1' });
  expect(await screen.findByText(c.closedReasons.family_chat_off)).toBeTruthy();
  expect(screen.queryByText(c.closedCard.body)).toBeNull();
});
