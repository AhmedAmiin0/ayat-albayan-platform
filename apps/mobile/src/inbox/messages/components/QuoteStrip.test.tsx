import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { quoteSides } from './content-side.helpers';

// Arabic UI (jest.setup: RTL): 'left' is the start (RN swaps it), so an Arabic quote sits on the right.
test('Arabic: an Arabic quote at the start, an English one on the left', async () => {
  expect(await quoteSides('السلام عليكم')).toEqual({ block: 'left', strip: 'left' });
  expect(await quoteSides('See you at five')).toEqual({ block: 'right', strip: 'right' });
});

test('the strip is a row: the sender keeps its width, the line is cut first, one label for both', async () => {
  await quoteSides('See you at five');
  const row = screen.getByTestId('reply-strip-line');
  expect(StyleSheet.flatten(row.props.style).flexDirection).toBe('row');
  expect(row.props.accessibilityLabel).toContain('Huda: See you at five');
  expect(StyleSheet.flatten(screen.getByText('Huda ·').props.style).flexShrink).toBe(0);
  expect(screen.getByText('See you at five').props.numberOfLines).toBe(1);
});
