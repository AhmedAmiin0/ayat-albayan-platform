// The ThreadFileSender test doubles shared by its send and upload scenarios.
import { vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';
import type { InboxSettings } from '@/modules/messaging/inbox/inbox.settings';
import type { Outbox } from '@/modules/messaging/inbox/send/outbox';
import { ThreadFileSender } from '@/modules/messaging/inbox/files/thread-file-send.service';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';

export const NOW = new Date('2026-10-02T09:00:00Z');
export const ACTOR = 's0000000-0000-4000-8000-000000000001';
export const REQ = 'c0000000-0000-4000-8000-000000000001';
export const PATH = `out/${ACTOR}/${REQ}/f.png`;
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
export const PDF = new TextEncoder().encode('%PDF-1.7\n   ');
export const MB = 1024 * 1024;

export const queries = { thread: vi.fn() };
export const outbox = { queue: vi.fn() };
export const storage = { info: vi.fn(), head: vi.fn(), signedUpload: vi.fn() };
export const sender = (maxMb?: number) => {
  const s = new ThreadFileSender(
    queries as unknown as ThreadsRepo,
    outbox as unknown as Outbox,
    storage as unknown as StorageService,
  );
  if (maxMb !== undefined) Object.assign(s, { settings: { read: async () => ({ upload_max_mb: maxMb, renewal_alert_remaining: 2 }) } satisfies Pick<InboxSettings, 'read'> });
  return s;
};
const input = (over: object = {}) => ({ clientRequestId: REQ, path: PATH, filename: 'الواجب.png', ...over });
export const send = (over: object = {}, s = sender()) =>
  s.send({ phone: PHONE, input: input(over), actorId: ACTOR, sales: { salesId: ACTOR } }, NOW);
export const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;
export const status = (e: unknown) => (e as { getStatus(): number }).getStatus();
