import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ClosedNote } from './ClosedNote';

// The closed window's note beside «أرسل قالبًا»: a new number's longer note must fit a 360dp phone.
test('a known chat: «sessionClosed» in two lines at most', async () => {
  await render(<ClosedNote known />);
  expect(screen.getByLabelText(t.inbox.sessionClosed).props.numberOfLines).toBe(2);
});

test('a new number: the first-template note gets three lines', async () => {
  await render(<ClosedNote known={false} />);
  const note = screen.getByLabelText(t.inbox.newChat.firstTemplate);
  expect(note.props.testID).toBe('closed-note');
  expect(note.props.numberOfLines).toBe(3);
});
