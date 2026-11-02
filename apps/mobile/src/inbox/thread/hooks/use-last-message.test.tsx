import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ChatHeader } from '@/inbox/thread/components/ChatHeader';
import { useLastMessageLine } from './use-last-message';

// A WhatsApp contact (docs/33 §4): Meta shares no presence; the header says when they last wrote.

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

function Header({ lastInboundAt }: { lastInboundAt: string | null }) {
  return <ChatHeader title="هدى سالم" status={useLastMessageLine(lastInboundAt)} onBack={jest.fn()} />;
}

test('the header: «آخر رسالة منذ 5 دقائق» on its own small line, with no online dot', async () => {
  await render(<Header lastInboundAt={ago(5)} />);
  const when = t.presence.minutes.few.replace('{n}', '5');
  expect(screen.getByText(t.presence.lastMessage.replace('{when}', when))).toBeTruthy();
  expect(screen.getByTestId('chat-status')).toBeTruthy();
  expect(screen.queryByTestId('presence-dot')).toBeNull();
});

test('a moment ago: «آخر رسالة الآن»', async () => {
  await render(<Header lastInboundAt={ago(0)} />);
  expect(screen.getByText(t.presence.lastMessage.replace('{when}', t.presence.now))).toBeTruthy();
});

test('they never wrote: no status line', async () => {
  await render(<Header lastInboundAt={null} />);
  expect(screen.queryByTestId('chat-status')).toBeNull();
});
