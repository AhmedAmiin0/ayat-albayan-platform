import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { thread } from '@/inbox/shared/thread-fixtures';
import { ThreadTime, TurnBadge } from './ThreadTrailing';

const now = new Date();

test('the time, and with unread messages the count', async () => {
  const th = { ...thread, unread_count: 2, last_direction: 'inbound' as const };
  await render(
    <>
      <ThreadTime thread={th} now={now} />
      <TurnBadge thread={th} />
    </>,
  );
  expect(screen.getByTestId('thread-time').props.children).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.unread.two)).toBeTruthy();
});

test('a read chat has no badge; a failed send shows the failed chip', async () => {
  const read = { ...thread, unread_count: 0, last_direction: 'inbound' as const };
  const { rerender } = await render(<TurnBadge thread={read} />);
  expect(screen.queryByTestId('unread-count')).toBeNull();
  await rerender(
    <TurnBadge thread={{ ...read, last_direction: 'outbound', last_status: 'failed' }} />,
  );
  expect(screen.getByText(t.enums.messageStatus.failed)).toBeTruthy();
});
