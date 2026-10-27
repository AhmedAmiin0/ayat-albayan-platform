import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SendIcon } from './chat-icons';

// English (LTR): «أرسل» sits on the right, the plane points right as drawn.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('SendIcon is not mirrored in LTR', async () => {
  await render(<SendIcon color="#000" />);
  expect(StyleSheet.flatten(screen.getByTestId('send-icon').props.style).transform).toEqual([{ scaleX: 1 }]);
});
