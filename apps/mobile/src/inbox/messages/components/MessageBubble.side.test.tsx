import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from './MessageBubble';
import { delivered, inbound, PHONE } from '../../shared/thread-fixtures';

// Arabic (jest.setup: RTL), where flex-start is the right: ours there, theirs on the left (owner 2026-10-26).
test('Arabic: ours on the right (inline-start), theirs on the left, the sharp corner at the screen edge', async () => {
  await renderWithQuery(<MessageBubble message={delivered} phone={PHONE} />);
  const ours = StyleSheet.flatten(screen.getByTestId(`bubble-${delivered.id}`).props.style);
  expect(ours.alignSelf).toBe('flex-start');
  expect(ours.borderTopStartRadius).toBeDefined();
  await renderWithQuery(<MessageBubble message={inbound} phone={PHONE} />);
  const theirs = StyleSheet.flatten(screen.getByTestId(`bubble-${inbound.id}`).props.style);
  expect(theirs.alignSelf).toBe('flex-end');
  expect(theirs.borderTopEndRadius).toBeDefined();
});

test('the text inside keeps its own direction (writingDirection auto)', async () => {
  await renderWithQuery(<MessageBubble message={inbound} phone={PHONE} />);
  expect(StyleSheet.flatten(screen.getByText(inbound.body ?? '').props.style).writingDirection).toBe('auto');
});
