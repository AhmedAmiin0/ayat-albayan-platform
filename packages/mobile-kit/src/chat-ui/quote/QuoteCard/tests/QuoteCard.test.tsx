import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { palette } from '../../../../theme';
import { t } from '../../../../lib/i18n/i18n';
import { QuoteBar } from '../../QuoteBar';
import { QuoteCard } from '../QuoteCard';
import { QuoteUnavailable } from '../../QuoteUnavailable';

test('the card: sender and line read as one label; a tap jumps to the original', async () => {
  const onJump = jest.fn();
  await render(
    <QuoteCard id="q1" sender="هدى" text="صورة" icon="📷" thumb={<Text>T</Text>} onJump={onJump} />,
  );
  const card = screen.getByTestId('quote-q1');
  expect(card.props.accessibilityLabel).toBe('هدى: صورة');
  expect(screen.getByText('📷 صورة')).toBeTruthy();
  expect(screen.getByText('T')).toBeTruthy();
  await fireEvent.press(card);
  expect(onJump).toHaveBeenCalledWith('q1');
});

test('without onJump the card is plain; an unavailable quote says so', async () => {
  await render(<QuoteCard id="q2" sender={null} text="hello" />);
  expect(screen.getByTestId('quote-q2').props.accessibilityState?.disabled).toBe(true);
  await render(<QuoteUnavailable />);
  expect(screen.getByText(t.inbox.reply.unavailable)).toBeTruthy();
});

test('the bar over the composer: one label, ✕ cancels', async () => {
  const onCancel = jest.fn();
  await render(<QuoteBar sender="Huda" text="See you" onCancel={onCancel} />);
  const line = screen.getByTestId('reply-strip-line');
  expect(line.props.accessibilityLabel).toBe(`${t.inbox.reply.strip}: Huda: See you`);
  await fireEvent.press(screen.getByLabelText(t.inbox.reply.cancel));
  expect(onCancel).toHaveBeenCalled();
});

test('a tone colours the bar and the sender; a drawn glyph stands in for the emoji', async () => {
  await render(<QuoteCard id="q2" sender="هدى" text="صورة" tone="act" glyph={<Text>G</Text>} />);
  const card = StyleSheet.flatten(screen.getByTestId('quote-q2').props.style);
  expect(card.borderStartColor).toBe(palette.light.act);
  expect(StyleSheet.flatten(screen.getByText('هدى').props.style).color).toBe(palette.light.act);
  expect(screen.getByText('G')).toBeTruthy();
  expect(screen.getByText('صورة')).toBeTruthy();
});

test('the bar takes a tone too; the brand by default', async () => {
  await render(<QuoteBar sender="هدى" text="صورة" onCancel={jest.fn()} />);
  const bar = () => StyleSheet.flatten(screen.getByTestId('reply-strip').props.style);
  expect(bar().borderStartColor).toBe(palette.light.lapis);
  await render(<QuoteBar sender="هدى" text="صورة" tone="ink2" onCancel={jest.fn()} />);
  expect(bar().borderStartColor).toBe(palette.light.ink2);
});
