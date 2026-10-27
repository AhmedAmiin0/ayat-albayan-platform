import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { answered } from './fixtures';
import { FeedbackRow } from './FeedbackRow';

// Arabic (jest.setup: RTL): the family's note aligns by its own words, not by the UI language.
const alignOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;

test('Arabic: an Arabic note at the start, an English note to the right', async () => {
  await render(<FeedbackRow row={answered} />);
  expect(alignOf('الحلقة كانت ممتازة')).toBe('left');
  await render(<FeedbackRow row={{ ...answered, note: 'Great lesson, thank you' }} />);
  expect(alignOf('Great lesson, thank you')).toBe('right');
});
