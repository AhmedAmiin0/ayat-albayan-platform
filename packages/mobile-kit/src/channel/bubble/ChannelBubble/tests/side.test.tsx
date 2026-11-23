import type { ChannelMessageView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { channelMessage } from '../../../testing/channel-fixtures';
import { ChannelBubble } from '../ChannelBubble';

// Arabic (jest setup: RTL), where flex-end is the left: mine there like WhatsApp, theirs on the
// right.
const NOW = new Date('2026-10-27T12:00:00.000Z');
const msg = (over: Partial<ChannelMessageView>): ChannelMessageView =>
  channelMessage({
    ...{ body: 'غدًا إن شاء الله', sender_role: 'teacher', sender_name: 'Abrar', mine: true },
    ...{ created_at: '2026-10-27T10:05:00.000Z' },
    ...over,
  });
const bubble = (over: Partial<ChannelMessageView>) =>
  render(<ChannelBubble message={msg(over)} tz="Asia/Riyadh" now={NOW} />);
const styleOf = (id: string) =>
  StyleSheet.flatten(screen.getByTestId(`channel-bubble-${id}`).props.style);
const styleOfText = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

test('Arabic: mine at the inline end with its tail there, theirs at the start', async () => {
  await bubble({});
  expect(styleOf('m1').alignSelf).toBe('flex-end');
  expect(styleOf('m1').borderTopEndRadius).toBeDefined();
  await bubble({ id: 'm2', mine: false });
  expect(styleOf('m2').alignSelf).toBe('flex-start');
  expect(styleOf('m2').borderTopStartRadius).toBeDefined();
});

test('Arabic: the text aligns by its own words (an English body to the right)', async () => {
  await bubble({});
  expect(styleOfText('غدًا إن شاء الله').textAlign).toBe('left');
  await bubble({ body: 'See you tomorrow' });
  expect(styleOfText('See you tomorrow').textAlign).toBe('right');
  expect(styleOfText('See you tomorrow').writingDirection).toBeUndefined();
});
