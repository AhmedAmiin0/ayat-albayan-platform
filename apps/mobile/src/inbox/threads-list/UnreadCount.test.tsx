import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { UnreadCount, unreadText } from './UnreadCount';

test('the number in a small circle; the reader hears the words', async () => {
  await render(<UnreadCount n={1} />);
  expect(screen.getByText('1')).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.unread.one)).toBeTruthy();
  expect(screen.getByTestId('unread-count')).toHaveStyle({ height: 22, borderRadius: 11 });
});

test('above 99 it draws «99+»', () => {
  expect(unreadText(7)).toBe('7');
  expect(unreadText(100)).toBe('99+');
});
