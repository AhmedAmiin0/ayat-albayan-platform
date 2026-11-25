import { errorTextOf } from '@ab/core';
import { waIdToE164 } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CrmLineEnv } from '@/config/env/env';
import {
  crmLookup,
  type CrmLookup,
  type CrmMessage,
  type FetchLike,
} from '@/modules/messaging/whatsapp';
import { InboundService } from '@/modules/messaging/webhook/inbound/webhook.inbound.service';
import { crmInboundEvent, type CrmQueueRow, type InboundPlace } from './crm-inbound.event';
import { CrmInboundRepo } from './crm-inbound.repo';
import type { CrmReceived } from './crm-received.schema';

// A family's or teacher's message to the notifications number, mirrored from the CRM into the
// inbox (docs/19 «crm driver»). Each due queue row: the contact (phone, name)
// and, for a file, its CRM message; then InboundService.handle (row, thread, broadcast, push;
// idempotent by wamid) and the row is deleted. A failure keeps the row, retried later: never
// dropped. An active teacher's message is not mirrored (teachers use the platform chat
// only): its row is deleted, it stays only in the CRM.

/** Read per pass: the CRM env, where a message lands, the fetch (a fake in tests). */
export interface CrmInboundSource {
  env: () => CrmLineEnv | null;
  place: () => InboundPlace;
  fetch: FetchLike;
}

export const CRM_INBOUND_SOURCE = Symbol('CRM_INBOUND_SOURCE');

const FIRST_RETRY_MS = 30_000;
const MAX_RETRY_MS = 3_600_000;
/** Rows per pass (each costs one or two CRM calls; the CRM allows 120 a minute). */
const BATCH = 20;
/** Content types that carry a file: their CRM message is read for its link. */
const WITH_FILE: ReadonlySet<string> = new Set([
  'image', 'audio', 'voice', 'video', 'document', 'sticker',
]);

/** The wait before attempt `n` again: 30 s doubling, at most an hour. */
export const retryAfterMs = (n: number): number =>
  Math.min(FIRST_RETRY_MS * 2 ** Math.min(n, 20), MAX_RETRY_MS);

/** The CRM's copy of this message (its file link), null when the CRM no longer lists it. */
async function fileOf(lookup: CrmLookup, row: CrmQueueRow): Promise<CrmMessage | null> {
  if (!WITH_FILE.has(row.content_type)) return null;
  const items = await lookup.messages(row.conversation_id);
  return items.find((i) => i.whatsapp_message_id === row.wa_message_id) ?? null;
}

@Injectable()
export class CrmInbound {
  private readonly log = new Logger(CrmInbound.name);

  constructor(
    @Inject(CrmInboundRepo) private readonly repo: CrmInboundRepo,
    @Inject(InboundService) private readonly inbound: InboundService,
    @Inject(CRM_INBOUND_SOURCE) private readonly source: CrmInboundSource,
  ) {}

  /** Queued by its wamid (a re-sent delivery is a no-op); the job picks it up (CrmInboundJob). */
  accept(received: CrmReceived): Promise<void> {
    return this.repo.enqueue(received);
  }

  /** One pass over the due rows; the count handed to the inbox. Throws only when the read fails. */
  async drain(now = new Date()): Promise<number> {
    let done = 0;
    for (const row of await this.repo.due(now, BATCH)) done += (await this.one(row, now)) ? 1 : 0;
    return done;
  }

  private async one(row: CrmQueueRow, now: Date): Promise<boolean> {
    try {
      const handed = await this.mirror(row);
      await this.repo.done(row.wa_message_id);
      return handed;
    } catch (e) {
      await this.later(row, { now, error: errorTextOf(e, 200) });
      return false;
    }
  }

  /** True once handed to the inbox; false for an active teacher's message (skipped). */
  private async mirror(row: CrmQueueRow): Promise<boolean> {
    const env = this.source.env();
    if (!env) throw new Error('no line or number on the crm driver');
    const lookup = crmLookup(env, this.source.fetch);
    const contact = await lookup.contact(row.contact_id);
    if (await this.fromTeacher(contact.phone)) {
      this.log.debug(`crm inbound ${row.wa_message_id.slice(-8)}: active teacher, not mirrored`);
      return false;
    }
    const media = await fileOf(lookup, row);
    const event = crmInboundEvent({ row, contact, media, place: this.source.place() });
    if (!event) throw new Error('the CRM contact has no phone');
    await this.inbound.handle(event);
    return true;
  }

  private async fromTeacher(waId: string | null | undefined): Promise<boolean> {
    const phone = waIdToE164(waId ?? '');
    return phone !== null && (await this.repo.isActiveTeacher(phone));
  }

  /** Kept for another try (its own failure is only logged: the row stays due for the next pass). */
  private async later(row: CrmQueueRow, at: { now: Date; error: string }): Promise<void> {
    const attempts = row.attempts + 1;
    const nextAt = new Date(at.now.getTime() + retryAfterMs(attempts));
    this.log.warn(`crm inbound ${row.wa_message_id.slice(-8)}: try ${String(attempts)}: ${at.error}`);
    try {
      await this.repo.retry({ waMessageId: row.wa_message_id, attempts, nextAt, error: at.error });
    } catch (e) {
      this.log.error(`crm inbound retry write failed: ${errorTextOf(e, 200)}`);
    }
  }
}
