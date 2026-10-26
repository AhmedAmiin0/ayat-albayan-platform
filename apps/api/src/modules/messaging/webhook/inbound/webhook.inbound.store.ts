import { Injectable } from '@nestjs/common';
import { LeadsService } from '../../../sales/leads/leads.service';
import { RatingStore } from '../../../teaching/lesson-rating/rating.store';
import type { RatingTap } from '../../../teaching/lesson-rating/rating.rows';
import type { InboundEvent } from '../webhook.events';
import { inboundRow, orderedAt, type RowInput } from './webhook.inbound';
import { WebhookQueries, type Contact } from '../webhook.queries';

export interface LeadLink {
  id: string | null;
  /** The lead this message created (first message from an unknown number). */
  created: string | null;
  /** Follow-ups already sent; a reply starts the cadence over. */
  stage: number;
  /** The lead's assistant (assigned_to, after auto-assign); null for a guardian, teacher or applicant. */
  owner: string | null;
}

export interface Sender {
  who: Contact;
  lead: LeadLink;
}

/** Who wrote (guardian / teacher / lead, R-LEAD-01), the stored inbound row and a rating tap. */
@Injectable()
export class InboundStore {
  constructor(
    private readonly queries: WebhookQueries,
    private readonly leads: LeadsService,
    private readonly ratings: RatingStore,
  ) {}

  /**
   * A guardian's or teacher's message never creates a lead (docs/12 §3.5); anyone else is upserted
   * (R-LEAD-01). upsertByPhone returns null for a job applicant (R-LEAD-04): no lead then.
   */
  async sender(input: { m: InboundEvent; phone: string }): Promise<Sender> {
    const { m, phone } = input;
    const who = await this.queries.identify(phone);
    const known = { id: who.lead?.id ?? null, created: null, stage: who.lead?.follow_up_stage ?? 0, owner: null };
    if (who.guardian || who.teacher) return { who, lead: known };
    const row = await this.leads.upsertByPhone({ phone, name: m.name, at: m.at });
    if (!row) return { who, lead: known };
    const created = who.lead ? null : row.id;
    return { who, lead: { id: row.id, created, stage: row.follow_up_stage, owner: row.assigned_to } };
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

  /** Legacy mode: the wa_numbers row of the receiving phone_number_id, as the chat import stamps it. Never blocks the row. */
  private async numberOf(m: InboundEvent): Promise<string | null> {
    return m.phoneNumberId ? this.queries.numberIdFor(m.phoneNumberId).catch(() => null) : null;
  }

  /** A guardian's lesson_rating tap on lesson_feedback (migration 195); runs only for a new wamid. */
  async rate(tap: RatingTap): Promise<void> {
    await this.ratings.record(tap);
  }

  /** Undoes save() when the side effects failed, so Meta's re-send of the wamid runs them again. */
  async forget(waMessageId: string): Promise<void> {
    await this.queries.deleteInbound(waMessageId);
  }
}
