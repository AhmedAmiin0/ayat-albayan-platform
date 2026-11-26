import { render, screen } from '@testing-library/react-native';
import { Figure } from './Figure';

test('the number over its word', async () => {
  await render(<Figure tone="ok" value="3" label="حضرها" />);
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('حضرها')).toBeTruthy();
});

test('each tone writes the number in its own ink', async () => {
  const inks = new Set<unknown>();
  for (const tone of ['ok', 'bad', 'act', 'ink'] as const) {
    await render(<Figure tone={tone} value={tone} label="x" />);
    inks.add(JSON.stringify(screen.getByText(tone).props.style));
  }
  expect(inks.size).toBe(4);
});
