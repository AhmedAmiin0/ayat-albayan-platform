import { renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { cachedThread, detail, inbound, PHONE } from '@/inbox/shared/thread-fixtures';
import { useInboxRead } from '@/inbox/thread/hooks/inbox-sync';

// docs/43 43-7 (review #675): a received row only the phone store brought was never stamped read
// on the server, so it never marks the chat read; the server's own pages do.

const fresh = { ...inbound, id: 'c0000000-0000-4000-8000-0000000000aa', created_at: '2026-10-02T10:00:00Z' };

test('a stored arrival over the server pages marks nothing; the server pages do', async () => {
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const http = cachedThread(detail([inbound]));
  const props = { data: cachedThread(detail([inbound, fresh])), httpData: http };
  const state = { isFetchedAfterMount: true, isSuccess: true };
  const hook = await renderHook((p: typeof props) => useInboxRead(PHONE, { ...state, ...p }), {
    wrapper: queryWrapper(client),
    initialProps: props,
  });
  const marks = invalidate.mock.calls.length;
  expect(marks).toBeGreaterThan(0); // the GET answered: read once
  await hook.rerender({ ...props, data: cachedThread(detail([inbound, fresh, { ...fresh, id: 'x' }])) });
  expect(invalidate.mock.calls.length).toBe(marks);
  await hook.rerender({ ...props, httpData: cachedThread(detail([inbound, fresh])) });
  expect(invalidate.mock.calls.length).toBeGreaterThan(marks);
});
