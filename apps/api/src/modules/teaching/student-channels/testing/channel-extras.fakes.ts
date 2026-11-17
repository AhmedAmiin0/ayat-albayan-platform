// The chat upgrade's fakes (test-only): read marks, bell rows and storage for channel files.
import { vi } from 'vitest';
import type { ReadMark } from '@/modules/teaching/student-channels/reads/channel-reads.repo';

/** The uploaded file of the fakes: in the fixture channel's folder (channel.fakes CH). */
export const UPLOADED = 'c3000000-0000-4000-8000-000000000001/f.jpg';

export function channelExtras() {
  const reads = { marks: vi.fn(async (_channelId: string): Promise<ReadMark[]> => []) };
  const bell = {
    rewrite: vi.fn(async (_input: { messageId: string; body: string }) => undefined),
  };
  const storage = {
    signedUpload: vi.fn(async (slot: { bucket: string; path: string }) => ({
      bucket: slot.bucket,
      path: slot.path,
      token: 'tok',
      signed_url: `https://storage.test/${slot.path}`,
    })),
    info: vi.fn(async (ref: { path: string }) =>
      ref.path === UPLOADED ? { size: 2048, contentType: 'image/jpeg' } : null,
    ),
    signedDownloads: vi.fn(
      async (input: { paths: readonly string[] }) =>
        new Map(input.paths.map((p) => [p, `https://storage.test/get/${p}`])),
    ),
  };
  return { reads, bell, storage };
}
