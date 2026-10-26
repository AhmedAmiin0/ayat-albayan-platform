import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { PRICES, WELCOME } from '../fixtures';
import { QuickReplyRow, slashTitle } from './QuickReplyRow';

const row = (id: string) => screen.getByTestId(`quick-reply-${id}`);

test('«/title» is isolated so the slash leads in Arabic and English alike', () => {
  expect(slashTitle('ترحيب')).toBe('⁨/ترحيب⁩');
  expect(slashTitle('greeting')).toBe('⁨/greeting⁩');
});

test('a row: the title then the text (two lines), the paperclip last, at the inline-end in RTL', async () => {
  await renderWithQuery(<QuickReplyRow reply={PRICES} query="" onPress={jest.fn()} />);
  const style = StyleSheet.flatten(row(PRICES.id).props.style);
  expect(style.flexDirection).toBe('row');
  expect(style.minHeight).toBeGreaterThanOrEqual(44);
  const [title, body] = screen.getAllByText(/./, { exact: false });
  expect(title?.props.children.join('')).toBe(slashTitle(PRICES.title));
  expect(body?.props.numberOfLines).toBe(2);
});

test('the searched letters are bold in the title and the text', async () => {
  await renderWithQuery(<QuickReplyRow reply={WELCOME} query="ترح" onPress={jest.fn()} />);
  const bold = screen.getAllByText('ترح');
  expect(bold.length).toBeGreaterThan(0);
});
