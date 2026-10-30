import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { IconButton } from './IconButton';

test('compact: 34pt wide in a crowded bar, hitSlop keeps the 44pt touch target', async () => {
  await render(
    <IconButton label="Emoji" onPress={() => undefined} compact>
      <Text>☺</Text>
    </IconButton>,
  );
  const button = screen.getByRole('button', { name: 'Emoji' });
  expect(button).toHaveStyle({ width: 34, height: 44 });
  expect(button.props.hitSlop).toEqual({ left: 5, right: 5 });
});

test('default: the 44pt square, no hitSlop', async () => {
  await render(
    <IconButton label="Back" onPress={() => undefined}>
      <Text>‹</Text>
    </IconButton>,
  );
  expect(screen.getByRole('button', { name: 'Back' })).toHaveStyle({ width: 44, height: 44 });
});
