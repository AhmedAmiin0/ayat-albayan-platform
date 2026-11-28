import type { Json } from '@ab/db';
import { chatMarkerOf, markerPayload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { LeadsService } from '@/modules/sales/leads';
import { RatingStore, type RatingTap } from '@/modules/teaching/lesson-rating';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import { inboundRow, orderedAt } from './webhook.inbound';
import type { LeadLink, RowInput, Sender } from './inbound.types';
import { WebhookRepo } from '@/modules/messaging/webhook/shared/webhook.repo';
import type { Contact } from '@/modules/messaging/webhook/shared/webhook.types';
import { orFallback } from '@/common/infra/errors';


const NOBODY: Contact = { guardian: null, teacher: null, lead: null };

const payloadSchema = z.record(z.string(), z.unknown());

/** The lead identify() found, as it is (no upsert): its id and follow-up stage. */
const knownLead = (who: Contact): LeadLink => ({
  id: who.lead?.id ?? null,
  created: null,
  stage: who.lead?.follow_up_stage ?? 0,
  owner: null,
});

/** Who wrote (guardian / teacher / lead, R-LEAD-01), the stored inbound row and a rating tap. */
@Injectable()
export class InboundStore {
  constructor(
    private readonly queries: WebhookRepo,
    private readonly leads: LeadsService,
    private readonly ratings: RatingStore,
  ) {}

  /**
   * A guardian's or teacher's message never creates a lead (docs/12 §3.5); anyone else is upserted
   * (R-LEAD-01). upsertByPhone returns null for a job applicant (R-LEAD-04): no lead then. `at`
   * (default: the message time) is the lead's last_inbound_at: its follow-up cycle starts there.
   */
  async sender(input: { m: InboundEvent; phone: string; at?: Date }): Promise<Sender> {
    const { m, phone, at = m.at } = input;
    const who = await this.queries.identify(phone);
    if (who.guardian || who.teacher) return { who, lead: knownLead(who) };
    const row = await this.leads.upsertByPhone({ phone, name: m.name, at });
    if (!row) return { who, lead: knownLead(who) };
    const created = who.lead ? null : row.id;
    return {
      who,
      lead: { id: row.id, created, stage: row.follow_up_stage, owner: row.assigned_to },
    };
  }

  /** The assistants an inbound alert goes to (docs/21 §6): the lead's, plus the family's owners. */
  async owners(who: Contact, lead: LeadLink): Promise<string[]> {
    const family = who.guardian ? await this.queries.guardianOwners(who.guardian.id) : [];
    return [...new Set([...(lead.owner ? [lead.owner] : []), ...family])];
  }

  /**
   * Inserts the row; false = Meta re-sent a wamid already stored (replay: no side effects). A new
   * message from a lead resets its follow-up stage (docs/12 §3.5).
   */
  async save(input: RowInput & { stage: number }): Promise<boolean> {
    const latest = await this.queries.latestInSecond(input.phone, input.m.at);
    const numberId = input.m.numberId ?? (await this.numberOf(input.m));
    const m = { ...input.m, at: orderedAt(input.m.at, latest), ...(numberId ? { numberId } : {}) };
    const stored = await this.queries.insertInbound(inboundRow({ ...input, m }));
    if (stored && input.leadId && input.stage > 0) {
      await this.queries.updateLead(input.leadId, { follow_up_stage: 0 });
    }
    return stored;
  }

  /**
   * A message from one of the academy's own numbers (OwnNumbers): the row only, already read, with
   * no lead, guardian or lesson; false = a replay. Never touches a lead (no follow-up reset).
   */
  saveOwn(m: InboundEvent, phone: string): Promise<boolean> {
    return this.save({ m, phone, who: NOBODY, leadId: null, lessonId: null, stage: 0, read: true });
  }

  /**
   * A family's edit, revoke or reaction kept as a hidden marker row (migration 992 applies it to
   * the message it names, now or when that arrives): already read, no lead, no text; false = a
   * replay.
   */
  saveMarker(m: InboundEvent, phone: string): Promise<boolean> {
    const marker = chatMarkerOf({
      ...(payloadSchema.safeParse(m.payload).data ?? {}),
      context: { id: m.replyTo },
    });
    if (!marker) return Promise.resolve(false);
    const row = {
      ...m,
      body: null,
      mediaId: null,
      mediaMime: null,
      payload: markerPayload(marker) as Json,
    };
    return this.save({
      m: row,
      phone,
      who: NOBODY,
      leadId: null,
      lessonId: null,
      stage: 0,
      read: true,
    });
  }

  /**
   * Legacy mode: the wa_numbers row of the receiving phone_number_id, as the chat import stamps it.
   * Never blocks the row.
   */
  private async numberOf(m: InboundEvent): Promise<string | null> {
    return m.phoneNumberId ? orFallback(this.queries.numberIdFor(m.phoneNumberId), null, 'receiving number read') : null;
  }

  /**
   * A guardian's lesson_rating tap on lesson_feedback (migration 195); runs only for a new wamid.
   */
  async rate(tap: RatingTap): Promise<void> {
    await this.ratings.record(tap);
  }

  /** Undoes save() when the side effects failed, so Meta's re-send of the wamid runs them again. */
  async forget(waMessageId: string): Promise<void> {
    await this.queries.deleteInbound(waMessageId);
  }
}
