import { PAYMENT_ATTACHMENTS_MAX } from '@ab/shared';
import { useRef } from 'react';
import type { Receipt } from '../receipt';

// «المرفقات» of a bank transfer (owner 2026-10-12): up to PAYMENT_ATTACHMENTS_MAX images / PDFs, all
// optional. The admin's payment form (bank only) and the salesperson's transfer share this list.

/** From the chat: already copied under the package (its path). A photo: uploaded on save. */
export type Attachment =
  | { kind: 'chat'; messageId: string; path: string }
  | { kind: 'file'; receipt: Receipt };

// A chat file by its message: each pick is copied under a new path, so the path would let it in twice.
const keyOf = (a: Attachment) => (a.kind === 'chat' ? `chat:${a.messageId}` : a.receipt.uri);

export const attachmentsFull = (list: readonly Attachment[]) => list.length >= PAYMENT_ATTACHMENTS_MAX;

/** One more at the end; the same file twice or a sixth is ignored. */
export function withAttachment(list: readonly Attachment[], item: Attachment): Attachment[] {
  if (attachmentsFull(list) || list.some((a) => keyOf(a) === keyOf(item))) return [...list];
  return [...list, item];
}

export function withoutAttachment(list: readonly Attachment[], index: number): Attachment[] {
  return list.filter((_, i) => i !== index);
}

type UploadReceipt = (subscriptionId: string, receipt: Receipt) => Promise<string>;

/**
 * The storage paths for POST …/payments `attachments`, in order. Each photo goes up once through
 * `upload` (the package's signed URL): a retry after a failed POST reuses the paths it already has.
 */
export function useAttachmentPaths(upload: UploadReceipt) {
  const done = useRef(new Map<string, string>());
  async function pathOf(subscriptionId: string, item: Attachment): Promise<string> {
    if (item.kind === 'chat') return item.path;
    const key = `${subscriptionId} ${item.receipt.uri}`;
    const known = done.current.get(key);
    if (known !== undefined) return known;
    const path = await upload(subscriptionId, item.receipt);
    done.current.set(key, path);
    return path;
  }
  return async (subscriptionId: string, list: readonly Attachment[]): Promise<string[]> => {
    const paths: string[] = [];
    // One at a time: a failed upload stops before the next, and nothing is posted.
    for (const item of list) paths.push(await pathOf(subscriptionId, item));
    return paths;
  };
}
