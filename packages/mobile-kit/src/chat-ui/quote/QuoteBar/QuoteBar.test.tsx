import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { QuoteBar } from './QuoteBar';

test('no sender: the bar shows only the quoted line, and its label says only that', async () => {
  await render(<QuoteBar sender={null} text="See you" onCancel={jest.fn()} />);
  const line = screen.getByTestId('reply-strip-line');
  expect(line.props.accessibilityLabel).toBe(`${t.inbox.reply.strip}: See you`);
  expect(screen.queryByText(/·/)).toBeNull();
  expect(screen.getByText('See you')).toBeTruthy();
});

test('a drawn glyph stands before the quoted words in place of the emoji', async () => {
  await render(
    <QuoteBar sender="Huda" text="notes" icon="📄" glyph={<Text>G</Text>} onCancel={jest.fn()} />,
  );
  expect(screen.getByText('G')).toBeTruthy();
  expect(screen.getByText('notes')).toBeTruthy();
  expect(screen.queryByText('📄 notes')).toBeNull();
});
