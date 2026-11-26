import { fireEvent, render, screen } from '@testing-library/react-native';
import { EmojiGrid } from './EmojiGrid';
import { EMOJI } from '@ab/client-core';

test('every curated emoji is a button named by itself; a tap picks it', async () => {
  const onPick = jest.fn();
  await render(<EmojiGrid onPick={onPick} />);
  expect(screen.getAllByRole('button')).toHaveLength(EMOJI.length);
  await fireEvent.press(screen.getByRole('button', { name: '🌹' }));
  expect(onPick).toHaveBeenCalledWith('🌹');
});
