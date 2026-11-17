import type { ChannelMessageView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { t } from '../lib/i18n/i18n';
import { ChannelBubble } from './ChannelBubble';

// Owner 2026-10-30: an edited message shows «تم التعديل» by its time; a deleted one only its line.
const NOW = new Date('2026-10-27T12:00:00.000Z');
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
const bubble = (over: Partial<ChannelMessageView>, onLongPress?: () => void) =>
  render(
    <ChannelBubble message={msg(over)} tz="Asia/Riyadh" now={NOW} onLongPress={onLongPress} />,
  );
const a = t.studentChannel.actions;

test('edited: the new text and «تم التعديل» by the time', async () => {
  await bubble({ edited: true });
  expect(screen.getByText(/الحلقة غدًا/)).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${a.edited} · `))).toBeTruthy();
});

test('not edited: no label', async () => {
  await bubble({});
  expect(screen.queryByText(new RegExp(a.edited))).toBeNull();
});

test('deleted: only «تم حذف هذه الرسالة», no text and no link', async () => {
  await bubble({ deleted: true, body: '' });
  expect(screen.getByText(a.deleted)).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
});

test('the assistant’s bubble: her name and her role word (owner 2026-11-16)', async () => {
  await bubble({ sender_role: 'sales', sender_name: 'سارة', mine: false });
  expect(screen.getByText(`سارة · ${t.studentChannel.roles.sales}`)).toBeTruthy();
});

test('a long press only where an action applies', async () => {
  await bubble({}, jest.fn());
  expect(screen.getByTestId('channel-bubble-m1').props.accessibilityHint).toBe(a.menu);
  await bubble({ id: 'm2' });
  expect(screen.getByTestId('channel-bubble-m2').props.accessibilityHint).toBeUndefined();
});
