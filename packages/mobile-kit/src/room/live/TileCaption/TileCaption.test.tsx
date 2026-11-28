import { render, screen } from '@testing-library/react-native';
import { TileCaption } from './TileCaption';

const hidden = { includeHiddenElements: true };

test('reads the name at the foot of the tile, hidden from the screen reader', async () => {
  await render(<TileCaption name="Suhaila" muted={false} />);
  expect(screen.getByTestId('tile-caption-name', hidden)).toHaveTextContent('Suhaila');
  expect(screen.queryByTestId('tile-caption')).toBeNull();
});

test('a struck mic sits before the name only while muted', async () => {
  await render(<TileCaption name="Suhaila" muted={false} />);
  expect(screen.getByTestId('tile-caption', hidden).children).toHaveLength(1);
  await screen.rerender(<TileCaption name="Suhaila" muted />);
  expect(screen.getByTestId('tile-caption', hidden).children).toHaveLength(2);
});
