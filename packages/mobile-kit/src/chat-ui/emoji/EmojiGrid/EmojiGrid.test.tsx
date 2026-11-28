import { fireEvent, render, screen } from '@testing-library/react-native';
import { emojiCell } from './emoji-grid.helpers';
import { EmojiGrid } from './EmojiGrid';
import { EMOJI } from '@ab/client-core';

test('every curated emoji is a button named by itself; a tap picks it', async () => {
  const onPick = jest.fn();
  await render(<EmojiGrid onPick={onPick} />);
  expect(screen.getAllByRole('button')).toHaveLength(EMOJI.length);
  await fireEvent.press(screen.getByRole('button', { name: '🌹' }));
  expect(onPick).toHaveBeenCalledWith('🌹');
});

test('a cell is 44 pt and takes the wash only while pressed', () => {
  const cell = emojiCell('wash');
  expect(cell({ pressed: true })).toMatchObject({
    width: 44,
    height: 44,
    backgroundColor: 'wash',
  });
  expect(cell({ pressed: false }).backgroundColor).toBe('transparent');
});
