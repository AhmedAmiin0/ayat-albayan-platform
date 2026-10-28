import type { MessageView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { MessageList } from './MessageList';
import { cachedThread, detail, message, PHONE } from '../../shared/thread-fixtures';
import type { useThread } from '../../thread/hooks/use-thread';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));
// Every bubble draw draws its meta line once: count them by message id.
const mockDraws = new Map<string, number>();
jest.mock('./MessageMeta', () => {
  const actual = jest.requireActual('./MessageMeta');
  return {
    ...actual,
    MessageMeta: (props: { message: MessageView }) => {
      mockDraws.set(props.message.id, (mockDraws.get(props.message.id) ?? 0) + 1);
      return actual.MessageMeta(props);
    },
  };
});

type ThreadQuery = ReturnType<typeof useThread>;
const stub = (messages: MessageView[]) =>
  ({ data: cachedThread(detail(messages)), hasNextPage: false, isFetchingNextPage: false, refetch: jest.fn(), fetchNextPage: jest.fn() }) as unknown as ThreadQuery;

const a = message({ id: 'a', direction: 'inbound', body: 'السلام عليكم', created_at: '2026-10-02T08:00:00Z' });
const b = message({ id: 'b', direction: 'outbound', body: 'وعليكم السلام', status: 'sent', created_at: '2026-10-02T08:01:00Z' });

beforeEach(() => mockDraws.clear());

// Owner 2026-10-27, «Avoid rerenders»: the cache keeps unchanged messages the same objects.
test('a tick change on one message redraws only that bubble', async () => {
  const view = await renderWithQuery(<MessageList phone={PHONE} query={stub([a, b])} />);
  await screen.findByText('وعليكم السلام');
  const before = new Map(mockDraws);
  await view.rerender(<MessageList phone={PHONE} query={stub([a, { ...b, status: 'read' }])} />);
  expect((mockDraws.get('b') ?? 0) - (before.get('b') ?? 0)).toBeGreaterThan(0);
  expect(mockDraws.get('a')).toBe(before.get('a'));
});

test('a new message draws its own bubble; the ones already there stay', async () => {
  const view = await renderWithQuery(<MessageList phone={PHONE} query={stub([a, b])} />);
  await screen.findByText('وعليكم السلام');
  const before = new Map(mockDraws);
  const c = message({ id: 'c', direction: 'inbound', body: 'جزاكم الله خيرًا', created_at: '2026-10-02T08:02:00Z' });
  await view.rerender(<MessageList phone={PHONE} query={stub([a, b, c])} />);
  await screen.findByText('جزاكم الله خيرًا');
  expect(mockDraws.get('c')).toBeGreaterThan(0);
  expect(mockDraws.get('a')).toBe(before.get('a'));
  expect(mockDraws.get('b')).toBe(before.get('b'));
});
