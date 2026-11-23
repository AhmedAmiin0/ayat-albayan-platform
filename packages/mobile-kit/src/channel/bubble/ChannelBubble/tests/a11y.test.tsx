import type { ChannelMessageView } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { channelMessage } from '../../../testing/channel-fixtures';
import { ChannelBubble, type ChannelBubbleProps } from '../ChannelBubble';

// Review 2026-11-17: a screen reader hears whose message it is, and the menu where one applies.
const NOW = new Date('2026-10-27T12:00:00.000Z');
const a = t.studentChannel.actions;
const msg = (over: Partial<ChannelMessageView>): ChannelMessageView =>
  channelMessage({ body: 'شكرًا', created_at: '2026-10-27T10:05:00.000Z', ...over });
const bubble = (m: ChannelMessageView, p: Partial<ChannelBubbleProps> = {}) =>
  render(<ChannelBubble message={m} tz="Asia/Riyadh" now={NOW} {...p} />);
const node = (id = 'm1') => screen.getByTestId(`channel-bubble-${id}`);

test('mine with a menu: one stop, «أنت» first, the hint and the long-press action', async () => {
  const onLongPress = jest.fn();
  await bubble(msg({ mine: true }), { onLongPress });
  expect(node().props.accessibilityLabel).toMatch(new RegExp(`^${t.studentChannel.you}: شكرًا`));
  expect(node().props.accessibilityHint).toBe(a.menuHint);
  await fireEvent(node(), 'accessibilityAction', { nativeEvent: { actionName: 'longpress' } });
  expect(onLongPress).toHaveBeenCalled();
});

test('theirs: the name and role first', async () => {
  await bubble(msg({ sender_name: 'فاطمة', sender_role: 'teacher' }), { onLongPress: jest.fn() });
  const role = t.studentChannel.roles.teacher;
  expect(node().props.accessibilityLabel).toMatch(new RegExp(`^فاطمة · ${role}: شكرًا`));
});

test('no menu (a monitor, a deleted message): no hint, no action', async () => {
  await bubble(msg({}));
  expect(node().props.accessibilityHint).toBeUndefined();
  expect(node().props.accessibilityActions).toBeUndefined();
});

test('a link keeps its own stop: the bubble is not one stop, its link stays reachable', async () => {
  await bubble(msg({ body: 'https://example.org/plan' }), { onLongPress: jest.fn() });
  expect(node().props.accessibilityHint).toBeUndefined();
  expect(screen.getByRole('link', { name: 'https://example.org/plan' })).toBeTruthy();
});

test('a follow-up of the same sender: no name line and no tail corner', async () => {
  await bubble(msg({ sender_name: 'فاطمة' }), { followUp: true });
  expect(screen.queryByText('فاطمة')).toBeNull();
  const box = StyleSheet.flatten(node().props.style);
  expect(box.borderTopStartRadius).toBe(box.borderRadius);
});

test('a row still on its way: «جارٍ الإرسال…» and the clock tick', async () => {
  await bubble(msg({ id: 'pending:c1', mine: true }));
  expect(screen.getByText(t.studentChannel.sending)).toBeTruthy();
  expect(screen.getByTestId('ticks-pending')).toBeTruthy();
});
