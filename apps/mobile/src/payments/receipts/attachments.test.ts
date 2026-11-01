import { renderHook } from '@testing-library/react-native';
import { type Attachment, attachmentsFull, useAttachmentPaths, withAttachment, withoutAttachment } from './attachments';
import type { Receipt } from '@/core/lib/receipts/receipt';

const photo = (n: number): Attachment => ({
  kind: 'file',
  receipt: { uri: `file:///p${n}.jpg`, mime: 'image/jpeg', bytes: new ArrayBuffer(1), size: 1 } satisfies Receipt,
});
const chat: Attachment = { kind: 'chat', messageId: 'm1', path: 'sub/wa-m1.jpg' };

test('added at the end, the same file once, five at most; removed by position', () => {
  let list = withAttachment([], chat);
  list = withAttachment(list, chat);
  expect(list).toEqual([chat]);
  expect(withAttachment(list, { ...chat, path: 'sub/wa-m1-second.jpg' })).toEqual([chat]); // same message, new copy
  expect(withAttachment(list, { ...chat, messageId: 'm2' })).toHaveLength(2);
  for (let n = 1; n <= 6; n += 1) list = withAttachment(list, photo(n));
  expect(list).toHaveLength(5);
  expect(attachmentsFull(list)).toBe(true);
  expect(withoutAttachment(list, 0)[0]).toEqual(photo(1));
});

test('paths in order: a chat file as is, each photo uploaded once across calls', async () => {
  const upload = jest.fn(async (_sub: string, r: Receipt) => `sub/${r.uri.slice(-6)}`);
  const { result } = await renderHook(() => useAttachmentPaths(upload));
  expect(await result.current('sub', [chat, photo(1)])).toEqual(['sub/wa-m1.jpg', 'sub/p1.jpg']);
  expect(await result.current('sub', [chat, photo(1), photo(2)])).toEqual(['sub/wa-m1.jpg', 'sub/p1.jpg', 'sub/p2.jpg']);
  expect(upload).toHaveBeenCalledTimes(2);
  expect(await result.current('sub', [])).toEqual([]);
});
