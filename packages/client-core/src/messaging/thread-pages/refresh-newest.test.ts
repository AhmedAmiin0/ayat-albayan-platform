import { describe, expect, it, vi } from 'vitest';
import type { ThreadDetail } from '@ab/shared';
import type { ThreadPages } from '../inbox/index.js';
import { type NewestCache, refreshNewest } from './refresh-newest.js';
import { cache, ids, msg, page } from './thread.fakes.test-util.js';

function store(data: ThreadPages | undefined, newest: () => Promise<ThreadDetail>, shown = true) {
  let held = data;
  const ports: NewestCache<ThreadPages> = {
    shown: () => shown,
    read: () => held,
    write: (edit) => {
      held = edit(held);
    },
    newest: vi.fn(newest),
    reload: vi.fn(async () => undefined),
  };
  return { ports, held: () => held };
}

/** Five loaded pages, the send's provisional row on the newest one. */
const scrolled = () =>
  cache(
    page([msg(40), msg(41, { id: 'tmp', status: 'queued' })], true),
    page([msg(30)], true),
    page([msg(20)], true),
    page([msg(10)], true),
    page([msg(1)]),
  );

describe('refreshNewest: after a send', () => {
  it('with five pages loaded reads only the newest page and folds it in', async () => {
    const data = scrolled();
    const s = store(data, async () => page([msg(40), msg(42)], true));
    await refreshNewest(s.ports);
    expect(s.ports.newest).toHaveBeenCalledTimes(1);
    expect(s.ports.reload).not.toHaveBeenCalled();
    expect(ids(s.held())[0]).toEqual(['m40', 'm42', 'tmp']);
    expect(s.held()?.pages.slice(1)).toEqual(data.pages.slice(1));
  });

  it('a gap re-reads every page instead', async () => {
    const s = store(scrolled(), async () => page([msg(90)], true));
    await refreshNewest(s.ports);
    expect(s.ports.reload).toHaveBeenCalledTimes(1);
  });

  it('nothing loaded yet: the query reads as usual', async () => {
    const s = store(undefined, async () => page([]));
    await refreshNewest(s.ports);
    expect(s.ports.newest).not.toHaveBeenCalled();
    expect(s.ports.reload).toHaveBeenCalledTimes(1);
  });

  it('a chat not on screen is only marked stale: no GET stamps it read', async () => {
    const s = store(scrolled(), async () => page([]), false);
    await refreshNewest(s.ports);
    expect(s.ports.newest).not.toHaveBeenCalled();
    expect(s.ports.reload).toHaveBeenCalledTimes(1);
  });

  it('a failed read keeps the cache and never throws', async () => {
    const data = scrolled();
    const s = store(data, async () => Promise.reject(new Error('offline')));
    await expect(refreshNewest(s.ports)).resolves.toBeUndefined();
    expect(s.held()).toBe(data);
    expect(s.ports.reload).not.toHaveBeenCalled();
  });
});
