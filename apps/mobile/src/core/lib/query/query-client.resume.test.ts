import { PERSIST_THROTTLE_MS, queryClient, RESUME_OWNED } from './query-client';

jest.mock('@/core/lib/http/supabase', () => ({ supabase: { auth: { signOut: jest.fn() } } }));

const focusRefetch = (queryKey: string[]) =>
  queryClient.getQueryDefaults(queryKey).refetchOnWindowFocus;

describe('one resume path for the inbox (docs/43 AU3)', () => {
  test('chats, lists, the badge and «القوائم» never refetch on focus: resumeInbox re-reads them', () => {
    expect(RESUME_OWNED).toEqual([['threads'], ['chat-lists']]);
    for (const key of [['threads', 'list', '{}'], ['threads', '+966500000001'], ['threads', 'nav-count', '/x']]) {
      expect(focusRefetch(key)).toBe(false);
    }
    expect(focusRefetch(['chat-lists'])).toBe(false);
  });

  test('every other feature keeps its focus refetch', () => {
    for (const key of [['students'], ['notifications'], ['thread-poll', '+966500000001'], ['leads']]) {
      expect(focusRefetch(key)).toBeUndefined();
    }
  });
});

test('the cache is written to disk at most every 5 s (docs/43 AU11)', () => {
  expect(PERSIST_THROTTLE_MS).toBe(5_000);
});
