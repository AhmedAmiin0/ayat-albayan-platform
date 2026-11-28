import { vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import type { MessageDispatch } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import { MessageWorker } from '@/modules/messaging/whatsapp/sender/message.worker';
import type { SenderRepo } from '@/modules/messaging/whatsapp/sender/sender.repo';

export const queries = {
  claim: vi.fn(),
  sent: vi.fn(),
  failure: vi.fn(),
  expire: vi.fn(),
  staffAtSend: vi.fn(),
};
export const dispatch = { send: vi.fn(), ready: vi.fn(), multi: false };
export const push = { notifyAdmins: vi.fn() };
export const NOW = new Date('2026-10-02T08:00:00Z');

/** A worker over the mocks above, the «sent» write's backoff instant. */
export function worker(): MessageWorker {
  const w = new MessageWorker(
    queries as unknown as SenderRepo,
    dispatch as unknown as MessageDispatch,
    push as unknown as PushService,
  );
  w.wait = vi.fn(() => Promise.resolve());
  return w;
}

/** Fresh mocks: claimed at attempt 1, sent, recorded, the recipient allowed. */
export function resetWorker(): void {
  vi.resetAllMocks();
  queries.claim.mockResolvedValue(1);
  queries.sent.mockResolvedValue(true);
  dispatch.send.mockResolvedValue({ waMessageId: 'wamid.1' });
  dispatch.ready.mockReturnValue(true);
}
