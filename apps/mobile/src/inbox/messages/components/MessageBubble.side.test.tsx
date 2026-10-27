import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from './MessageBubble';
import { delivered, inbound, PHONE } from '../../shared/thread-fixtures';

// Arabic (jest.setup: RTL), as WhatsApp in Arabic: ours at the inline-end (the left), theirs at the start (the right).
test('Arabic: ours at flex-end (the left), theirs at flex-start (the right), the sharp corner at the screen edge', async () => {
  await renderWithQuery(<MessageBubble message={delivered} phone={PHONE} />);
  const ours = StyleSheet.flatten(screen.getByTestId(`bubble-${delivered.id}`).props.style);
  expect(ours.alignSelf).toBe('flex-end');
  expect(ours.borderTopEndRadius).toBeDefined();
  await renderWithQuery(<MessageBubble message={inbound} phone={PHONE} />);
  const theirs = StyleSheet.flatten(screen.getByTestId(`bubble-${inbound.id}`).props.style);
  expect(theirs.alignSelf).toBe('flex-start');
  expect(theirs.borderTopStartRadius).toBeDefined();
});
