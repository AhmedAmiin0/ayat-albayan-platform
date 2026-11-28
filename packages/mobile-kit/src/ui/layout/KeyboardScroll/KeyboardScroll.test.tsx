import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { space } from '../../../theme';
import { KeyboardScroll } from './KeyboardScroll';

// The library's jest mock renders KeyboardAwareScrollView as a ScrollView, so its props are read.
test('scrolls a focused field above the keyboard, a step clear of it, and keeps taps', async () => {
  await render(
    <KeyboardScroll testID="form" contentContainerStyle={{ gap: 16 }}>
      <Text>field</Text>
    </KeyboardScroll>,
  );
  const scroll = screen.getByTestId('form');
  expect(screen.getByText('field')).toBeTruthy();
  expect(scroll.props.bottomOffset).toBe(space[4]);
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  expect(scroll.props.automaticallyAdjustKeyboardInsets).toBeUndefined();
});

test('a screen may still let a drag dismiss the keyboard', async () => {
  await render(<KeyboardScroll testID="form" keyboardDismissMode="on-drag" />);
  expect(screen.getByTestId('form').props.keyboardDismissMode).toBe('on-drag');
});
