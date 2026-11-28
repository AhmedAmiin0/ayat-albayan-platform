import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { BubbleText } from './BubbleText';

test('a link in the words opens in the browser', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<BubbleText body="انظر https://example.org/a" />);
  await fireEvent.press(screen.getByRole('link'));
  expect(open).toHaveBeenCalledWith('https://example.org/a');
});

test('a link that cannot open is ignored', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no app'));
  await render(<BubbleText body="https://example.org" />);
  await fireEvent.press(screen.getByRole('link'));
  expect(screen.getByRole('link')).toBeTruthy();
});

test('words with no link have no link', async () => {
  await render(<BubbleText body="السلام عليكم" />);
  expect(screen.getByText('السلام عليكم')).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
});
