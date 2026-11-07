import type { Logger } from '@nestjs/common';
import type { SendOutcome } from '@/modules/messaging/whatsapp/sender/message.job';

/** One pass's counts, per outcome. */
export type SendSummary = Record<SendOutcome, number>;

export const emptySummary = (): SendSummary => ({
  sent: 0, retry: 0, failed: 0, expired: 0, stale: 0, held: 0, paused: 0, skipped: 0, waiting: 0,
});

/** Logged only when a pass did something (skipped rows alone stay quiet). */
export function reportPass(log: Logger, summary: SendSummary): SendSummary {
  const busy = Object.entries(summary).some(([outcome, n]) => outcome !== 'skipped' && n > 0);
  if (busy) log.log(`outbound messages: ${JSON.stringify(summary)}`);
  return summary;
}
