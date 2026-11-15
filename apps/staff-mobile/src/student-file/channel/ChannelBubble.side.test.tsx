import type { ChannelMessageView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ChannelBubble } from './ChannelBubble';

// Arabic (jest.setup: RTL), where flex-end is the left: mine there like WhatsApp, theirs on the right.
const msg = (over: Partial<ChannelMessageView>): ChannelMessageView => ({
  id: 'm1',
  body: 'غدًا إن شاء الله',
  sender_role: 'teacher',
  sender_name: 'أبرار',
  mine: true,
  created_at: '2026-10-27T10:05:00.000Z',
  edited: false,
  deleted: false,
  ...over,
});
const styleOf = (id: string) => StyleSheet.flatten(screen.getByTestId(`channel-bubble-${id}`).props.style);
const alignOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;

test('Arabic: mine at the inline end with its tail there, theirs at the start', async () => {
  await render(<ChannelBubble message={msg({})} tz="Asia/Riyadh" />);
  expect(styleOf('m1').alignSelf).toBe('flex-end');
  expect(styleOf('m1').borderTopEndRadius).toBeDefined();
  await render(<ChannelBubble message={msg({ id: 'm2', mine: false })} tz="Asia/Riyadh" />);
  expect(styleOf('m2').alignSelf).toBe('flex-start');
  expect(styleOf('m2').borderTopStartRadius).toBeDefined();
});

test('Arabic: the text aligns by its own words (an English body to the right)', async () => {
  await render(<ChannelBubble message={msg({})} tz="Asia/Riyadh" />);
  expect(alignOf('غدًا إن شاء الله')).toBe('left');
  await render(<ChannelBubble message={msg({ body: 'See you tomorrow' })} tz="Asia/Riyadh" />);
  expect(alignOf('See you tomorrow')).toBe('right');
  expect(StyleSheet.flatten(screen.getByText('See you tomorrow').props.style).writingDirection).toBeUndefined();
});
