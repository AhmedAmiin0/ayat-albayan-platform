import { mergeNewest, provisionalMessage, threadMessages } from './thread-cache';
import { cachedThread, delivered, detail, failed, inbound, message, NOW, PHONE } from '../../shared/thread-fixtures';

// mergeNewest: what a poll of the newest page does to the cached thread.

const older = message({ id: 'm0', body: 'قديمة', created_at: '2026-09-30T08:00:00Z' });
const ids = (data: ReturnType<typeof mergeNewest>) => threadMessages(data).map((m) => m.id);

test('a new message joins the newest page; older pages stay as they are', () => {
  const data = cachedThread(detail([inbound, delivered], { has_more: true }), detail([older]));
  const next = mergeNewest(data, detail([delivered, failed], { has_more: true }));
  expect(next?.pages[0]?.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  expect(next?.pages[1]).toBe(data.pages[1]);
  expect(ids(next)).toEqual(['m0', 'm1', 'm2', 'm3']);
});

test('the fresh row wins (a tick changed); the page keeps its own has_more while it keeps older rows', () => {
  const data = cachedThread(detail([inbound, { ...delivered, status: 'sent' }], { has_more: false }));
  const next = mergeNewest(data, detail([delivered, failed], { has_more: true }));
  expect(next?.pages[0]?.messages.find((m) => m.id === 'm2')?.status).toBe('delivered');
  expect(next?.pages[0]?.has_more).toBe(false);
  expect(mergeNewest(cachedThread(detail([inbound])), detail([inbound], { has_more: true }))?.pages[0]?.has_more).toBe(true);
});

test('a provisional row still sending survives the poll, after the fresh rows', () => {
  const temp = provisionalMessage({ id: 'tmp', phone: PHONE, body: 'جارٍ', now: NOW });
  const data = cachedThread(detail([inbound, temp]));
  expect(ids(mergeNewest(data, detail([inbound, delivered])))).toEqual(['m1', 'm2', 'tmp']);
  expect(ids(mergeNewest(data, detail([])))).toEqual(['m1', 'tmp']);
});

test('nothing cached: nothing to merge into', () => {
  expect(mergeNewest(undefined, detail([inbound]))).toBeUndefined();
  expect(mergeNewest({ pages: [], pageParams: [] }, detail([inbound]))).toEqual({ pages: [], pageParams: [] });
});
