import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { thread } from '@/inbox/shared/thread-fixtures';
import { ThreadTrailing } from './ThreadTrailing';

test('the time on top and, with unread messages, the count under it', async () => {
  await render(<ThreadTrailing thread={{ ...thread, unread_count: 2, last_direction: 'inbound' }} now={new Date()} />);
  expect(screen.getByTestId('thread-time').props.children).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.unread.two)).toBeTruthy();
});

test('a read chat shows only its time; a failed send shows the failed chip', async () => {
  const { rerender } = await render(<ThreadTrailing thread={{ ...thread, unread_count: 0, last_direction: 'inbound' }} now={new Date()} />);
  expect(screen.getByTestId('thread-time')).toBeTruthy();
  expect(screen.queryByTestId('unread-count')).toBeNull();
  await rerender(<ThreadTrailing thread={{ ...thread, unread_count: 0, last_direction: 'outbound', last_status: 'failed' }} now={new Date()} />);
  expect(screen.getByText(t.enums.messageStatus.failed)).toBeTruthy();
});
