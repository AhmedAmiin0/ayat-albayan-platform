import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { PRICES } from '../testing/fixtures';
import { QuickReplyRow } from './QuickReplyRow';

// Arabic UI (jest.setup: RTL): each line aligns by its own language, never a forced writingDirection.
const english = { ...PRICES, id: 'en1', title: 'prices', body: 'Hello, the prices are attached.' };
const styleOf = (text: string | RegExp) => StyleSheet.flatten(screen.getByText(text).props.style);

test('an Arabic body keeps the start (left = start in RTL); no writingDirection', async () => {
  await renderWithQuery(<QuickReplyRow reply={PRICES} query="" onPress={jest.fn()} />);
  const body = styleOf(PRICES.body.replace(/\s+/g, ' '));
  expect(body.textAlign).toBe('left');
  expect(body.writingDirection).toBeUndefined();
});

test('an English body sits on the other side (right in RTL)', async () => {
  await renderWithQuery(<QuickReplyRow reply={english} query="" onPress={jest.fn()} />);
  expect(styleOf(english.body).textAlign).toBe('right');
});
