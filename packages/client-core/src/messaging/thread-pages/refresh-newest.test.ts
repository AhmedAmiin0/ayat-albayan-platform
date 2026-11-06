import { describe, expect, it, vi } from 'vitest';
import type { ThreadDetail } from '@ab/shared';
import type { ThreadPages } from '../inbox/index.js';
import { type NewestCache, refreshNewest } from './refresh-newest.js';
import { cache, ids, msg, page } from './thread.fakes.test-util.js';

interface Store {
  newest: () => Promise<ThreadDetail>;
  shown?: boolean;
  /** busy() answers in turn (the last one repeats): before the GET, after it. */
  busy?: boolean[];
  own?: string[];
}

function store(data: ThreadPages | undefined, opts: Store) {
  let held = data;
  const answers = [...(opts.busy ?? [false])];
  const ports: NewestCache<ThreadPages> = {
    shown: () => opts.shown ?? true,
    busy: () => (answers.length > 1 ? answers.shift() : answers[0]) ?? false,
    read: () => held,
    write: (edit) => {
      held = edit(held);
    },
    newest: vi.fn(opts.newest),
    reload: vi.fn(async () => undefined),
    ...(opts.own ? { own: opts.own } : {}),
  };
  return { ports, held: () => held };
}

/** Five loaded pages, the API's row of the send (s41, queued) already in place on the newest. */
const scrolled = () =>
  cache(
    page([msg(40), msg(41, { id: 's41', direction: 'outbound', status: 'queued' })], true),
    page([msg(30)], true),
    page([msg(20)], true),
    page([msg(10)], true),
    page([msg(1)]),
  );
const sentRow = msg(41, { id: 's41', direction: 'outbound', status: 'sent' });

describe('refreshNewest: after a send', () => {
  it('with five pages loaded reads only the newest page and folds it in', async () => {
    const data = scrolled();
    const s = store(data, { newest: async () => page([msg(40), sentRow, msg(42)], true) });
    await refreshNewest(s.ports);
    expect(s.ports.newest).toHaveBeenCalledTimes(1);
    expect(s.ports.reload).not.toHaveBeenCalled();
    expect(ids(s.held())[0]).toEqual(['m40', 's41', 'm42']);
    expect(s.held()?.pages[0]?.messages[1]?.status).toBe('sent');
    expect(s.held()?.pages.slice(1)).toEqual(data.pages.slice(1));
  });

  it('a gap is seen although the send row sits in both pages: every page is read again', async () => {
    // More than a page arrived since the last read: the fresh page holds only new rows + the send.
    const newest = async () => page([msg(60), msg(61), sentRow], true);
    const s = store(scrolled(), { newest });
    await refreshNewest(s.ports);
    expect(s.ports.reload).toHaveBeenCalledTimes(1);
    // The send's row already ticked (sent): only its id, named by the caller, keeps it out.
    const ticked = () => cache(page([msg(40), sentRow], true), page([msg(30)]));
    const named = store(ticked(), { newest, own: ['s41'] });
    await refreshNewest(named.ports);
    expect(named.ports.reload).toHaveBeenCalledTimes(1);
    const unnamed = store(ticked(), { newest });
    await refreshNewest(unnamed.ports);
    expect(unnamed.ports.reload).not.toHaveBeenCalled();
  });

  it('a read in flight at the start (scrolling up, a push, a focus refetch) is replaced, no GET', async () => {
    const s = store(scrolled(), { newest: async () => page([]), busy: [true] });
    await refreshNewest(s.ports);
    expect(s.ports.newest).not.toHaveBeenCalled();
    expect(s.ports.reload).toHaveBeenCalledTimes(1);
  });

  it('a read that started during the GET wins over a merge: every page is read again', async () => {
    const data = scrolled();
    const s = store(data, { newest: async () => page([msg(40), sentRow]), busy: [false, true] });
    await refreshNewest(s.ports);
    expect(s.ports.reload).toHaveBeenCalledTimes(1);
    expect(s.held()).toBe(data);
  });

  it('nothing loaded yet: the query reads as usual', async () => {
    const s = store(undefined, { newest: async () => page([]) });
    await refreshNewest(s.ports);
    expect(s.ports.newest).not.toHaveBeenCalled();
    expect(s.ports.reload).toHaveBeenCalledTimes(1);
  });

  it('a chat query without an active observer is only marked stale: no GET stamps it read', async () => {
    const s = store(scrolled(), { newest: async () => page([]), shown: false });
    await refreshNewest(s.ports);
    expect(s.ports.newest).not.toHaveBeenCalled();
    expect(s.ports.reload).toHaveBeenCalledTimes(1);
  });

  it('a failed read keeps the cache and never throws', async () => {
    const data = scrolled();
    const s = store(data, { newest: async () => Promise.reject(new Error('offline')) });
    await expect(refreshNewest(s.ports)).resolves.toBeUndefined();
    expect(s.held()).toBe(data);
    expect(s.ports.reload).not.toHaveBeenCalled();
  });
});
