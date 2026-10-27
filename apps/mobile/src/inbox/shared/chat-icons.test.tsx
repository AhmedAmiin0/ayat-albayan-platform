import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SendIcon } from './chat-icons';

// Arabic (jest.setup: RTL): «أرسل» sits at the inline-end (the left), its plane points left.
test('SendIcon is mirrored in RTL', async () => {
  await render(<SendIcon color="#000" />);
  expect(StyleSheet.flatten(screen.getByTestId('send-icon').props.style).transform).toEqual([{ scaleX: -1 }]);
});
