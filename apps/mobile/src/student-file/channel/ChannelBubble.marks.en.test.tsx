import type { ChannelMessageView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ChannelBubble } from './ChannelBubble';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const msg: ChannelMessageView = {
  id: 'm1',
  body: '',
  sender_role: 'guardian',
  sender_name: 'Umm Salma',
  mine: false,
  created_at: '2026-10-27T10:05:00.000Z',
  edited: false,
  deleted: true,
};

test('English: a deleted message keeps its side and shows only the deleted line', async () => {
  await render(<ChannelBubble message={msg} tz="Asia/Riyadh" />);
  expect(screen.getByText(t.studentChannel.actions.deleted)).toBeTruthy();
  const box = StyleSheet.flatten(screen.getByTestId('channel-bubble-m1').props.style);
  expect(box.alignSelf).toBe('flex-start');
});
