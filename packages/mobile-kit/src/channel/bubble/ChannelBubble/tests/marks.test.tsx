import type { ChannelMessageView } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { channelMessage } from '../../../testing/channel-fixtures';
import { ChannelBubble, type ChannelBubbleProps } from '../ChannelBubble';

// An edited message shows the edited mark by its time; a deleted one only its line.
const NOW = new Date('2026-10-27T12:00:00.000Z');
const msg = (over: Partial<ChannelMessageView>) =>
  channelMessage({
    ...{ body: 'الحلقة غدًا https://example.org/plan', sender_role: 'teacher' },
    ...{ sender_name: 'أبرار', mine: true, created_at: '2026-10-27T10:05:00.000Z' },
    ...over,
  });
const bubble = (over: Partial<ChannelMessageView>, p: Partial<ChannelBubbleProps> = {}) =>
  render(<ChannelBubble message={msg(over)} tz="Asia/Riyadh" now={NOW} {...p} />);
const a = t.studentChannel.actions;

test('edited: the new text and «تم التعديل» by the time', async () => {
  await bubble({ edited: true });
  expect(screen.getByText(/الحلقة غدًا/)).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${a.edited} · `))).toBeTruthy();
});

test('the words: 15pt Noto in ink, the link clickable', async () => {
  await bubble({});
  const words = StyleSheet.flatten(screen.getByText(/الحلقة غدًا/).props.style);
  expect(words).toMatchObject({ fontSize: 15, fontFamily: 'NotoSansArabic_400Regular' });
  expect(screen.getByRole('link', { name: 'https://example.org/plan' })).toBeTruthy();
  expect(screen.queryByText(new RegExp(a.edited))).toBeNull();
});

test('deleted: only «تم حذف هذه الرسالة», no text, no link, no ticks', async () => {
  await bubble({ deleted: true, body: '' });
  expect(screen.getByText(a.deleted)).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.queryByTestId('ticks-sent')).toBeNull();
});

test('the assistant’s bubble: her name and her role word, no ticks (owner 2026-11-16)', async () => {
  await bubble({ sender_role: 'sales', sender_name: 'سارة', mine: false });
  expect(screen.getByText('سارة')).toBeTruthy();
  expect(screen.getByText(t.studentChannel.roles.sales)).toBeTruthy();
  expect(screen.queryByTestId('ticks-sent')).toBeNull();
});

test('mine: ✓ sent until everyone read it, then blue ✓✓; a long press shows who', async () => {
  const onReads = jest.fn();
  await bubble({}, { onReads });
  expect(screen.getByTestId('ticks-sent')).toBeTruthy();
  await bubble({ id: 'm2', read_by_all: true }, { onReads });
  await fireEvent(screen.getByTestId('ticks-read'), 'longPress');
  expect(onReads).toHaveBeenCalled();
});

test('a reply shows its quote; a tap on it jumps to the original', async () => {
  const onJump = jest.fn();
  const reply_to = {
    ...{ id: 'q1', sender_name: 'فاطمة', sender_role: 'teacher' as const },
    ...{ body: 'الواجب: سورة النبأ', kind: 'text' as const, deleted: false },
  };
  await bubble({ reply_to }, { onJump });
  await fireEvent.press(screen.getByTestId('quote-q1'));
  expect(onJump).toHaveBeenCalledWith('q1');
});

test('a long press only where the menu offers something', async () => {
  const onLongPress = jest.fn();
  await bubble({}, { onLongPress });
  await fireEvent(screen.getByTestId('channel-bubble-m1'), 'longPress');
  expect(onLongPress).toHaveBeenCalled();
});
