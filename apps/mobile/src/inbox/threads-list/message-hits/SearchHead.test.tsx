import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SearchHead } from './SearchHead';

// Above the chats while searching (docs/37): the hint at 1–2 characters, «المحادثات» when both
// sections show; the hits themselves stay under the chats.

test('1–2 characters: the three-character hint, above the chats', async () => {
  await render(<SearchHead q="در" asked={false} both={false} />);
  expect(screen.getByTestId('message-hits-hint').props.children).toBe(t.inbox.messageSearch.hint);
});

test('chats and message hits both: «المحادثات» labels the chats', async () => {
  await render(<SearchHead q="درس" asked both />);
  expect(screen.getByRole('header', { name: t.inbox.messageSearch.chats })).toBeTruthy();
});

test('an empty box, or only one section: nothing', async () => {
  await render(<SearchHead q="" asked={false} both={false} />);
  expect(screen.toJSON()).toBeNull();
  await render(<SearchHead q="درس" asked both={false} />);
  expect(screen.toJSON()).toBeNull();
});
