import { expect, test } from 'vitest';
import {
  isRead,
  READ_TIMEOUT_MS,
  readTimeoutFor,
  SEND_TIMEOUT_MS,
  SLOW_READ_TIMEOUT_MS,
  SLOW_SEND_TIMEOUT_MS,
  sendTimeoutFor,
} from './timeouts.js';

test('only GET and HEAD are reads', () => {
  const reads = [undefined, 'get', 'HEAD'].map((method) => isRead(method ? { method } : {}));
  expect(reads).toEqual([true, true, true]);
  const writes = ['POST', 'PATCH', 'PUT', 'DELETE'].map((method) => isRead({ method }));
  expect(writes).toEqual([false, false, false, false]);
  expect(isRead()).toBe(true);
});

test('chat files, PDF pages and booking media: the slow deadline; other reads: normal', () => {
  const chat = '/threads/%2B9665/messages/m1';
  const media = '/threads/%2B9665/media/m1';
  const slow = [`${chat}/file`, `${chat}/file?download=1`, `${chat}/pdf/2`, media];
  expect(slow.map(readTimeoutFor)).toEqual(Array<number>(4).fill(SLOW_READ_TIMEOUT_MS));
  const normal = ['/threads?page=1', '/threads/%2B9665', `${chat}/files`, `${media}/x`];
  expect(normal.map(readTimeoutFor)).toEqual(Array<number>(4).fill(READ_TIMEOUT_MS));
});

test('a chat send gets 30 s; the admin batch writes get the slow deadline', () => {
  expect(SEND_TIMEOUT_MS).toBe(30_000);
  const sends = ['/threads/%2B9665/text', '/threads/%2B9665/template', '/messages/m1/retry'];
  expect(sends.map(sendTimeoutFor)).toEqual(Array<number>(3).fill(SEND_TIMEOUT_MS));
  const batch = [
    '/admin/google/reconcile',
    '/admin/numbers/import',
    '/admin/numbers/n1/templates/sync',
    '/payouts/2026-09/generate',
    '/leads/assign-unassigned',
    '/schedule-rules/refresh',
  ];
  expect(batch.map(sendTimeoutFor)).toEqual(Array<number>(6).fill(SLOW_SEND_TIMEOUT_MS));
});
