import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import type { HoldPlace } from './hold-key';

/** The first hold, and the longest one (each renewal doubles it up to this). */
export interface HoldSpan {
  minMs: number;
  maxMs: number;
}

/** What a lane hold says about a due row: send it, it was deferred, or it reached 48 h. */
export type HoldCheck = 'send' | 'deferred' | 'aged';

/** Where a row leaves from, and when. */
export interface HoldAt extends HoldPlace {
  now: Date;
}

/** One kind of lane hold: the 131042 payment hold, or a provider outage. */
export interface LaneHoldPolicy {
  /** messages.error_code on the rows it defers. */
  code: string;
  /** messages.error_text on the rows it defers untried (the probe keeps the provider's words). */
  text: string;
  /** The deferred rows come due this long after the probe, so at the hold end only it is. */
  staggerMs: number;
  span: HoldSpan;
  keyOf: (at: HoldPlace) => string | null;
  /** The rows this hold defers (the payment hold: templates only). */
  holds: (row: DueMessage) => boolean;
}
