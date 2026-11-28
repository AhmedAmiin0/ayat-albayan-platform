import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AttachTile } from '../AttachTile';

test('a tile: its full name to the screen reader, its short word under the circle', async () => {
  const onPress = jest.fn();
  await render(
    <AttachTile label="الردود السريعة" short="ردود" onPress={onPress}>
      <Text>i</Text>
    </AttachTile>,
  );
  expect(screen.getByText('ردود')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'الردود السريعة' }));
  expect(onPress).toHaveBeenCalled();
});

test('without a short word the full name shows under the circle', async () => {
  await render(
    <AttachTile label="صورة" onPress={jest.fn()}>
      <Text>i</Text>
    </AttachTile>,
  );
  expect(screen.getByText('صورة')).toBeTruthy();
});
