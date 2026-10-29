import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { PRICES } from '../testing/fixtures';
import { QuickReplyRow } from './QuickReplyRow';

// An English phone (LTR): an Arabic reply aligns right, an English one keeps the start.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const english = { ...PRICES, id: 'en1', title: 'prices', body: 'Hello, the prices are attached.' };
const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

test('an Arabic body aligns right in the English UI', async () => {
  await renderWithQuery(<QuickReplyRow reply={PRICES} query="" onPress={jest.fn()} />);
  expect(styleOf(PRICES.body.replace(/\s+/g, ' ')).textAlign).toBe('right');
});

test('an English body keeps the start (left)', async () => {
  await renderWithQuery(<QuickReplyRow reply={english} query="" onPress={jest.fn()} />);
  expect(styleOf(english.body).textAlign).toBe('left');
});
