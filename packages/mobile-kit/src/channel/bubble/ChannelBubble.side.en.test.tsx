import type { ChannelMessageView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ChannelBubble } from './ChannelBubble';

// An English run: the native flag is LTR (jest setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const NOW = new Date('2026-10-27T12:00:00.000Z');
const msg = (over: Partial<ChannelMessageView>): ChannelMessageView => ({
  id: 'm1',
  body: 'See you tomorrow',
  sender_role: 'teacher',
  sender_name: 'Abrar',
  mine: true,
  created_at: '2026-10-27T10:05:00.000Z',
  edited: false,
  deleted: false,
  ...over,
});
const bubble = (over: Partial<ChannelMessageView>) =>
  render(<ChannelBubble message={msg(over)} tz="Asia/Riyadh" now={NOW} />);
const styleOf = (id: string) =>
  StyleSheet.flatten(screen.getByTestId(`channel-bubble-${id}`).props.style);
const alignOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;

test('English: mine at the inline end (the right), theirs at the start', async () => {
  await bubble({});
  expect(styleOf('m1').alignSelf).toBe('flex-end');
  expect(styleOf('m1').borderTopEndRadius).toBeDefined();
  expect(screen.getByText('You')).toBeTruthy();
  await bubble({ id: 'm2', mine: false });
  expect(styleOf('m2').alignSelf).toBe('flex-start');
  expect(styleOf('m2').borderTopStartRadius).toBeDefined();
});

test('English: an Arabic body aligns to the right, an English one to the start', async () => {
  await bubble({});
  expect(alignOf('See you tomorrow')).toBe('left');
  await bubble({ body: 'غدًا إن شاء الله' });
  expect(alignOf('غدًا إن شاء الله')).toBe('right');
});
