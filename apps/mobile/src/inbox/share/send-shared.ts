import type { MessageView } from '@ab/shared';
import { sendChatFile } from '@/inbox/composer/send-file';
import type { SharedFile } from './read-share';
import { toChatFile } from './shared-file';

// docs/38 §mobile 10: the shared files go strictly one at a time through the chat's own file send.
// A failure does not stop the rest; a retry passes only the failed files, with the same ids.

export type ShareResult =
  | { ok: true; item: SharedFile; row: MessageView }
  | { ok: false; item: SharedFile; error: unknown };

interface SendSharedInput {
  phone: string;
  items: readonly SharedFile[];
  /** useUploadMaxBytes. */
  maxBytes: number;
}

async function sendOne(input: SendSharedInput, item: SharedFile): Promise<ShareResult> {
  try {
    const file = await toChatFile(item, input.maxBytes);
    const row = await sendChatFile({ phone: input.phone, file, id: item.id, maxBytes: input.maxBytes });
    return { ok: true, item, row };
  } catch (error) {
    return { ok: false, item, error };
  }
}

/** Each file in order; onStep(n, m) before the n-th of m starts. Never rejects. */
export async function sendSharedFiles(
  input: SendSharedInput,
  onStep: (done: number, total: number) => void,
): Promise<ShareResult[]> {
  const total = input.items.length;
  const results: ShareResult[] = [];
  for (const [i, item] of input.items.entries()) {
    onStep(i + 1, total);
    // One at a time on purpose: a phone uploads one file well, ten at once badly.
    results.push(await sendOne(input, item));
  }
  return results;
}
