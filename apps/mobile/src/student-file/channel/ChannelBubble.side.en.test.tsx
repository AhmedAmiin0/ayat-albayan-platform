import type { ChannelMessageView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ChannelBubble } from './ChannelBubble';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const msg = (over: Partial<ChannelMessageView>): ChannelMessageView => ({
  id: 'm1',
  body: 'See you tomorrow',
  sender_role: 'teacher',
  sender_name: 'Abrar',
  mine: true,
  created_at: '2026-10-27T10:05:00.000Z',
  ...over,
});
const styleOf = (id: string) => StyleSheet.flatten(screen.getByTestId(`channel-bubble-${id}`).props.style);
const alignOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;

test('English: mine at the inline end (the right), theirs at the start', async () => {
  await render(<ChannelBubble message={msg({})} tz="Asia/Riyadh" />);
  expect(styleOf('m1').alignSelf).toBe('flex-end');
  expect(styleOf('m1').borderTopEndRadius).toBeDefined();
  expect(screen.getByText('You')).toBeTruthy();
  await render(<ChannelBubble message={msg({ id: 'm2', mine: false })} tz="Asia/Riyadh" />);
  expect(styleOf('m2').alignSelf).toBe('flex-start');
  expect(styleOf('m2').borderTopStartRadius).toBeDefined();
});

test('English: an Arabic body aligns to the right, an English one to the start', async () => {
  await render(<ChannelBubble message={msg({})} tz="Asia/Riyadh" />);
  expect(alignOf('See you tomorrow')).toBe('left');
  await render(<ChannelBubble message={msg({ body: 'غدًا إن شاء الله' })} tz="Asia/Riyadh" />);
  expect(alignOf('غدًا إن شاء الله')).toBe('right');
});
