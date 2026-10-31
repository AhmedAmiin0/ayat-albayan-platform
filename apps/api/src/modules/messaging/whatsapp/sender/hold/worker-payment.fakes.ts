import { vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { PaymentHoldRepo } from './payment-hold.repo';
import { PaymentHolds } from './payment-holds';
import type { MessageDispatch } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import { MessageWorker, type SendJob } from '@/modules/messaging/whatsapp/sender/message.worker';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { SenderQueries } from '@/modules/messaging/whatsapp/sender/sender.queries';

// Test-only (excluded from the build): a worker with the real 131042 line hold over fakes.

export const queries = {
  claim: vi.fn(),
  sent: vi.fn(),
  failure: vi.fn(),
  expire: vi.fn(),
  staffAtSend: vi.fn(),
};
export const dispatch = { send: vi.fn(), ready: vi.fn(), multi: true };
export const push = { notifyAdmins: vi.fn() };
export const repo = { defer: vi.fn(), deferMany: vi.fn(), move: vi.fn() };
export const NOW = new Date('2026-10-30T08:00:00Z');
export const LATER = new Date('2026-10-30T08:10:00Z');
export const payment = new WaError('(#131042) payment issue', { code: 131042, status: 400 });
const TEMPLATE = templateRow();

/** A reminder (template row) on the notifications line. */
export const reminder = (id: string, over = {}) =>
  dueMessage({
    id,
    template_key: TEMPLATE.key,
    lesson_id: null,
    lesson: null,
    created_at: NOW.toISOString(),
    ...over,
  });
/** A staff chat reply (session text) on the notifications line. */
export const reply = (id: string) =>
  dueMessage({ id, template_key: null, template_params: null, body: 'أهلًا', created_by: 'a1' });

export const job = (row: SendJob['row'], now = NOW): SendJob => ({
  row,
  template: row.template_key ? TEMPLATE : null,
  now,
  autoOn: true,
});

export function resetPaymentFakes(): void {
  vi.resetAllMocks();
  dispatch.ready.mockReturnValue(true);
  queries.claim.mockResolvedValue(1);
  queries.sent.mockResolvedValue(true);
}

export function worker(): MessageWorker {
  const w = new MessageWorker(
    queries as unknown as SenderQueries,
    dispatch as unknown as MessageDispatch,
    push as unknown as PushService,
    new PaymentHolds(repo as unknown as PaymentHoldRepo),
  );
  w.wait = vi.fn(async () => undefined);
  return w;
}

/** The push subjects sent so far. */
export const subjects = () =>
  push.notifyAdmins.mock.calls.map((c: unknown[]) => (c[1] as { subject: string }).subject);
