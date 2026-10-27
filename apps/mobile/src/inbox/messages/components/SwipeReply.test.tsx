import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { dragBy } from './swipe-reply.helpers';

// Arabic (jest.setup: RTL): the inline-end is the left, so every bubble, ours and theirs, answers a swipe left.
test('Arabic: a swipe to the left (-dx) answers; to the right does nothing', async () => {
  expect(await dragBy(-60)).toEqual({ claims: true, answered: true });
  expect(await dragBy(60)).toEqual({ claims: false, answered: false });
});

test('the reply icon waits at the row start, which the bubble uncovers as it moves toward the end', async () => {
  await dragBy(-60);
  const icon = screen.getByTestId('swipe-reply-icon', { includeHiddenElements: true });
  expect(StyleSheet.flatten(icon.props.style)).toMatchObject({ start: 4 });
});
