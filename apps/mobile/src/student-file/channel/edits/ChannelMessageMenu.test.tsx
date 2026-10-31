import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ChannelThread } from '@/student-file/channel/ChannelThread';
import { renderWithQuery } from '@/test/query';

// Owner 2026-10-30: «تعديل» (15 min) and «حذف للجميع» (48 h) for the sender; the admin deletes any.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const a = t.studentChannel.actions;
const inText = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const msg = (over: Partial<ChannelMessageView>): ChannelMessageView => ({
  ...{ id: 'm1', body: 'الحلقة غدًا', sender_role: 'teacher', sender_name: 'أبرار' },
  ...{ mine: true, created_at: ago(5), edited: false, deleted: false },
  ...over,
});
const page = (messages: ChannelMessageView[], readOnly = false): ChannelPage => ({
  ...{ student_name: 'سلمى', messages, has_more: false, read_only: readOnly },
  ...{ open: true, channel_id: '' },
});

async function hold(audience: 'teacher' | 'admin' | 'sales', m: ChannelMessageView) {
  mockApiFetch.mockResolvedValue(page([m], audience !== 'teacher'));
  await renderWithQuery(<ChannelThread refs={{ audience, studentId: 's1' }} />);
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

test("the admin deletes anyone's message (moderation); the owning assistant has no menu", async () => {
  const menu = await hold('admin', msg({ mine: false, created_at: ago(9999) }));
  await fireEvent.press(menu.getByRole('button', { name: a.deleteForAll }));
  expect(menu.getByText(inText(a.moderateBody))).toBeTruthy();
  await fireEvent.press(menu.getByRole('button', { name: a.deleteConfirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('DELETE', '/students/s1/channel/messages/m1'),
  );
});

async function noMenu(audience: 'teacher' | 'sales', m: ChannelMessageView) {
  mockApiFetch.mockResolvedValue(page([m], audience === 'sales'));
  await renderWithQuery(<ChannelThread refs={{ audience, studentId: 's1' }} />);
  await fireEvent(await screen.findByTestId(`channel-bubble-${m.id}`), 'longPress');
  expect(screen.queryByTestId('channel-message-menu')).toBeNull();
}

test("no menu on someone else's message", () => noMenu('teacher', msg({ mine: false })));
test('no menu on a deleted message', () => noMenu('teacher', msg({ deleted: true, body: '' })));
test('no menu for the owning assistant (sales)', () => noMenu('sales', msg({ mine: false })));
