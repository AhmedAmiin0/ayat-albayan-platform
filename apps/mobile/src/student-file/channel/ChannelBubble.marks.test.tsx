import type { ChannelMessageView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ChannelBubble } from './ChannelBubble';

// Owner 2026-10-30: an edited message shows «تم التعديل» by its time; a deleted one only its line.
const msg = (over: Partial<ChannelMessageView>): ChannelMessageView => ({
  id: 'm1',
  body: 'الحلقة غدًا https://example.org/plan',
  sender_role: 'teacher',
  sender_name: 'أبرار',
  mine: true,
  created_at: '2026-10-27T10:05:00.000Z',
  edited: false,
  deleted: false,
  ...over,
});
const a = t.studentChannel.actions;

test('edited: the new text and «تم التعديل» by the time', async () => {
  await render(<ChannelBubble message={msg({ edited: true })} tz="Asia/Riyadh" />);
  expect(screen.getByText(/الحلقة غدًا/)).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${a.edited} · `))).toBeTruthy();
});

test('not edited: no label', async () => {
  await render(<ChannelBubble message={msg({})} tz="Asia/Riyadh" />);
  expect(screen.queryByText(new RegExp(a.edited))).toBeNull();
});

test('deleted: only «تم حذف هذه الرسالة», no text and no link', async () => {
  await render(<ChannelBubble message={msg({ deleted: true, body: '' })} tz="Asia/Riyadh" />);
  expect(screen.getByText(a.deleted)).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
});

test('a long press only where an action applies', async () => {
  const onLongPress = jest.fn();
  await render(<ChannelBubble message={msg({})} tz="Asia/Riyadh" onLongPress={onLongPress} />);
  expect(screen.getByTestId('channel-bubble-m1').props.accessibilityHint).toBe(a.menu);
  await render(<ChannelBubble message={msg({ id: 'm2' })} tz="Asia/Riyadh" />);
  expect(screen.getByTestId('channel-bubble-m2').props.accessibilityHint).toBeUndefined();
});
