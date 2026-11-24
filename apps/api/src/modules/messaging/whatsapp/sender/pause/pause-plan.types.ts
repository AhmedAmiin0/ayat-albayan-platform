import type { WaLine } from '@ab/catalog';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';

/** A paused lane: the log line and the admin push subject (null = none). */
export interface Pause {
  subject: string | null;
  log: string | null;
}

/** A failed row's plan and where it was sent from. */
export interface PauseAt {
  row: { id: string };
  line: WaLine;
  route?: NumberRoute | null;
  now: Date;
  plan: FailurePlan;
}
