import { retry } from '@ab/shared';
import type { Logger } from '@nestjs/common';
import { RECORD_DELAYS_MS } from '@/modules/messaging/whatsapp/sender/message.job';
import type { SenderRepo } from '@/modules/messaging/whatsapp/sender/sender.repo';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import type { WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';

interface RecordDeps {
  queries: SenderRepo;
  /** The backoff's sleep (tests replace it). */
  wait: (ms: number) => Promise<void>;
  log: Logger;
}

/**
 * «sent», retried hard after Meta accepted (RECORD_DELAYS_MS). If every try fails the claim's
 * SENDING mark stays and the next pass asks the admin (UNCERTAIN): never sent again.
 */
export async function recordSent(
  deps: RecordDeps,
  input: { row: DueMessage; sent: WaSent },
): Promise<void> {
  const { row, sent } = input;
  const record = () => deps.queries.sent({ row, sent, at: new Date() });
  if (!(await retry(record, { delays: RECORD_DELAYS_MS, sleep: deps.wait }))) {
    deps.log.log(`message ${row.id} was marked sent by hand while it was sending`);
  }
}
