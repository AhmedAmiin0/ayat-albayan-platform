import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ApiError } from '../../lib/http/api';
import { t } from '../../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../../testing/query';
import { palette } from '../../theme';
import { ChannelThread } from '../ChannelThread';
import { channelMessage, channelPage } from '../testing/channel-fixtures';

// The sender may edit for 15 min and delete for everyone for 48 h; the admin deletes any.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('../../lib/http/api', () => ({
  ...jest.requireActual('../../lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const a = t.studentChannel.actions;
const inText = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const msg = (over: Partial<ChannelMessageView>): ChannelMessageView =>
  channelMessage({
    ...{ body: 'الحلقة غدًا', sender_role: 'teacher', sender_name: 'أبرار' },
    ...{ mine: true, created_at: ago(5) },
    ...over,
  });
const page = (messages: ChannelMessageView[], readOnly = false): ChannelPage =>
  channelPage({ messages, read_only: readOnly });
type Audience = 'teacher' | 'admin' | 'sales';
const thread = (audience: Audience) =>
  renderWithQuery(<ChannelThread refs={{ audience, studentId: 's1' }} />, freshQueryClient());

async function hold(audience: Audience, m: ChannelMessageView) {
  mockApiFetch.mockResolvedValue(page([m], audience === 'admin'));
  await thread(audience);
  await fireEvent(await screen.findByTestId(`channel-bubble-${m.id}`), 'longPress');
  return within(screen.getByTestId('channel-message-menu'));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset().mockResolvedValue({});
});

test('my message within 15 minutes: edit (PATCH, trimmed) and delete', async () => {
  const menu = await hold('teacher', msg({}));
  expect(menu.getByRole('button', { name: a.deleteForAll })).toBeTruthy();
  await fireEvent.press(menu.getByRole('button', { name: a.edit }));
  await fireEvent.changeText(menu.getByLabelText(a.editTitle), '  الحلقة بعد غد  ');
  await fireEvent.press(menu.getByRole('button', { name: a.save }));
  const path = '/teachers/me/channels/s1/messages/m1';
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', path, { body: 'الحلقة بعد غد' }),
  );
});

test('after 15 minutes only delete, asked first (DELETE)', async () => {
  const menu = await hold('teacher', msg({ created_at: ago(60) }));
  expect(menu.queryByRole('button', { name: a.edit })).toBeNull();
  await fireEvent.press(menu.getByRole('button', { name: a.deleteForAll }));
  expect(menu.getByText(inText(a.deleteBody))).toBeTruthy();
  await fireEvent.press(menu.getByRole('button', { name: a.deleteConfirm }));
  const path = '/teachers/me/channels/s1/messages/m1';
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('DELETE', path));
});

test('a refusal is said in words (the window just closed)', async () => {
  mockApiSend.mockRejectedValue(new ApiError(403, { code: 'delete_window_closed' }));
  const menu = await hold('teacher', msg({ created_at: ago(60) }));
  await fireEvent.press(menu.getByRole('button', { name: a.deleteForAll }));
  await fireEvent.press(menu.getByRole('button', { name: a.deleteConfirm }));
  expect(await menu.findByText(a.errors.delete_window_closed)).toBeTruthy();
});

test("the admin deletes anyone's message (moderation), asked first", async () => {
  const menu = await hold('admin', msg({ mine: false, created_at: ago(9999) }));
  await fireEvent.press(menu.getByRole('button', { name: a.deleteForAll }));
  expect(menu.getByText(inText(a.moderateBody))).toBeTruthy();
  await fireEvent.press(menu.getByRole('button', { name: a.deleteConfirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('DELETE', '/students/s1/channel/messages/m1'),
  );
});

test('the owning assistant edits her own message through her route (owner 2026-11-16)', async () => {
  const menu = await hold('sales', msg({ sender_role: 'sales', sender_name: 'سارة' }));
  await fireEvent.press(menu.getByRole('button', { name: a.edit }));
  await fireEvent.changeText(menu.getByLabelText(a.editTitle), 'موعد التجديد غدًا');
  await fireEvent.press(menu.getByRole('button', { name: a.save }));
  const path = '/sales/students/s1/channel/messages/m1';
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', path, { body: 'موعد التجديد غدًا' }),
  );
});

async function noMenu(audience: 'teacher' | 'sales', m: ChannelMessageView) {
  mockApiFetch.mockResolvedValue(page([m]));
  await thread(audience);
  await fireEvent(await screen.findByTestId(`channel-bubble-${m.id}`), 'longPress');
  expect(screen.queryByTestId('channel-message-menu')).toBeNull();
}

/** Someone else's message offers reply only; the API refuses edit and delete. */
async function replyOnly(audience: 'teacher' | 'sales', m: ChannelMessageView) {
  const menu = await hold(audience, m);
  expect(menu.getByRole('button', { name: t.studentChannel.reply.action })).toBeTruthy();
  expect(menu.queryByRole('button', { name: a.edit })).toBeNull();
  expect(menu.queryByRole('button', { name: a.deleteForAll })).toBeNull();
}

test("someone else's message: reply only", () => replyOnly('teacher', msg({ mine: false })));
test('no menu on a deleted message', () => noMenu('teacher', msg({ deleted: true, body: '' })));
test("the owning assistant: reply only on the teacher's message", () =>
  replyOnly('sales', msg({ mine: false })));

test('a read-only view offers no edit or delete on my message (the API refuses them)', async () => {
  const menu = await hold('admin', msg({ mine: true, created_at: ago(1) }));
  expect(menu.queryByRole('button', { name: a.edit })).toBeNull();
  expect(menu.queryByRole('button', { name: t.studentChannel.reply.action })).toBeNull();
});

test('a closed chat refusal is said in its own words', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'channel_not_open' }));
  const menu = await hold('teacher', msg({}));
  await fireEvent.press(menu.getByRole('button', { name: a.deleteForAll }));
  await fireEvent.press(menu.getByRole('button', { name: a.deleteConfirm }));
  expect(await menu.findByText(a.errors.channel_not_open)).toBeTruthy();
});

test('the menu (ChatXMenu): its rows in order, no «إلغاء» row; the held bubble is lit', async () => {
  const menu = await hold('teacher', msg({}));
  const names = menu.getAllByRole('button').map((b) => b.props.accessibilityLabel);
  const c = t.studentChannel;
  expect(names).toEqual([c.reply.action, a.edit, a.deleteForAll, c.reads.action]);
  expect(menu.queryByRole('button', { name: t.common.cancel })).toBeNull();
  const box = StyleSheet.flatten(screen.getByTestId('channel-bubble-m1').props.style);
  expect(box.borderColor).toBe(palette.light.lapis);
});
