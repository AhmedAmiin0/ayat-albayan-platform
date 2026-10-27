import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ClosedNote } from './ClosedNote';

// The closed window's note beside «أرسل قالبًا» (owner 2026-10-27): never cut, it wraps and the row grows.
test('a known chat: the whole «sessionClosed», with no line limit', async () => {
  await render(<ClosedNote known />);
  const note = screen.getByTestId('closed-note');
  expect(note).toHaveTextContent(t.inbox.sessionClosed);
  expect(note.props.accessibilityLabel).toBe(t.inbox.sessionClosed);
  expect(note.props.numberOfLines).toBeUndefined();
  expect(note.props.ellipsizeMode).toBeUndefined();
});

test('a new number: the whole first-template note, with no line limit', async () => {
  await render(<ClosedNote known={false} />);
  const note = screen.getByLabelText(t.inbox.newChat.firstTemplate);
  expect(note.props.testID).toBe('closed-note');
  expect(note).toHaveTextContent(t.inbox.newChat.firstTemplate);
  expect(note.props.numberOfLines).toBeUndefined();
});

test('the short copy: one sentence, no dash', () => {
  expect(t.inbox.sessionClosed).toBe('مرّت 24 ساعة على آخر رسالة منه، فأرسل قالبًا.');
});
