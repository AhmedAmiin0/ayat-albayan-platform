import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { palette } from '../../../theme';
import { TileAction } from './TileAction';

test('a labelled button over the tile that draws its icon in the inverse ink', async () => {
  const onPress = jest.fn();
  const icon = jest.fn((ink: string) => <Text>{ink}</Text>);
  await render(<TileAction label="zoom" onPress={onPress} icon={icon} />);
  expect(icon).toHaveBeenCalledWith(palette.light.onInverse);
  await fireEvent.press(screen.getByRole('button', { name: 'zoom' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
