import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import type { MessageViews } from '../../whatsapp/messages/message.views';
import type { ReadReceipts } from '../reads/read-receipts';
import { threadRow } from '../inbox.fakes';
import { NO_PEOPLE } from '../test-app';
import type { ThreadsQueries } from './threads.queries';
import { ThreadsService } from './threads.service';

/** Every read takes one 60 ms round trip (the edge logs: 30–90 ms each); elapsed / 60 = sequential rounds. */
const RTT = 60;
const slow = <T>(value: T) => vi.fn(() => new Promise<T>((done) => setTimeout(() => done(value), RTT)));

function service() {
  const queries = {
    list: slow({ items: [threadRow({ guardian_id: 'g1' })], total: 1 }),
    unsupported: vi.fn((rows: unknown[]) => new Promise((done) => setTimeout(() => done(rows), RTT))),
    familyTags: slow(new Map()),
    thread: slow(threadRow({ guardian_id: 'g1' })),
    messages: slow([messageRow({ template_key: null, body: 'سلام' })]),
    known: slow(null),
    people: slow(NO_PEOPLE),
    lessons: slow([]),
  };
  const views = { view: vi.fn((m: { id: string }) => new Promise((done) => setTimeout(() => done({ id: m.id }), RTT))) };
  const receipts = { open: slow(undefined) };
  const svc = new ThreadsService(queries as unknown as ThreadsQueries, views as unknown as MessageViews, receipts as unknown as ReadReceipts);
  return { svc, queries };
}

async function rounds(run: () => Promise<unknown>): Promise<number> {
  const start = Date.now();
  const done = run();
  await vi.runAllTimersAsync();
  await done;
  return (Date.now() - start) / RTT;
}

describe('ThreadsService — independent reads in parallel (owner 2026-10-27: endpoints chain calls)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('GET /threads: 2 rounds, the unsupported marks beside the family tags (was 3 when a page has an empty last message)', async () => {
    const { svc, queries } = service();
    expect(await rounds(() => svc.list({ page: 1, pageSize: 20 }))).toBe(2);
    expect(queries.familyTags).toHaveBeenCalledWith(['g1']);
  });

  it('GET /threads/:phone, first page: 3 rounds (was 5: stamp, thread, messages + people, views, lessons)', async () => {
    const { svc, queries } = service();
    const detail = svc.detail({ phone: '+966551234567', limit: 50 });
    expect(await rounds(() => detail)).toBe(3);
    await expect(detail).resolves.toMatchObject({ has_more: false, lessons: [], people: NO_PEOPLE });
    expect(queries.lessons).toHaveBeenCalledWith(expect.objectContaining({ guardian_id: 'g1' }), expect.any(Date));
  });

  it('an older page: 2 rounds (was 4: thread, messages, tag, views), no stamp, no people or lessons', async () => {
    const { svc, queries } = service();
    expect(await rounds(() => svc.detail({ phone: '+966551234567', before: '2026-10-01T00:00:00Z', limit: 50 }))).toBe(2);
    expect(queries.people).not.toHaveBeenCalled();
    expect(queries.lessons).not.toHaveBeenCalled();
  });
});
