import type { Logger } from '@nestjs/common';
import {
  DELIVERY_STATUSES,
  type DeliveryStatus,
} from '@/modules/messaging/webhook/webhook.events';
import { CrmLookupError, type CrmMessage } from '@/modules/messaging/whatsapp';

// Small helpers of the crm confirm (docs/19 «Confirming an uncertain send»): what its log says
// (never a key, a whole phone or a body), and how a CRM message's status and wamids are read.

const isDelivery = (s: string): s is DeliveryStatus =>
  (DELIVERY_STATUSES as readonly string[]).includes(s);

/** The CRM message's own status as a delivery status; anything else (pending, failed…) none. */
export const deliveryOf = (s: string | null | undefined): DeliveryStatus | null =>
  s && isDelivery(s) ? s : null;

/** The tail of an id or phone for the log: never the whole value. */
export const tail = (v: string): string => `…${v.slice(-4)}`;

export const wamids = (items: readonly CrmMessage[]): string[] =>
  items.flatMap((i) => i.whatsapp_message_id ?? []);

const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 160);

/** Why a confirm stopped: a missing scope once per process (then silence), anything else a skip. */
export class LookupNotes {
  private readonly warned = new Set<string>();

  constructor(private readonly log: Logger) {}

  report(e: unknown): void {
    const failure =
      e instanceof CrmLookupError ? e.failure : { kind: 'skip' as const, reason: reason(e) };
    const note =
      failure.kind === 'scope'
        ? this.scopeNote(failure.scope)
        : `crm confirm skipped: ${failure.reason}`;
    if (note) this.log.warn(note);
  }

  private scopeNote(scope: string): string | null {
    if (this.warned.has(scope)) return null;
    this.warned.add(scope);
    return `CRM key lacks ${scope}: uncertain sends are not confirmed`;
  }
}
