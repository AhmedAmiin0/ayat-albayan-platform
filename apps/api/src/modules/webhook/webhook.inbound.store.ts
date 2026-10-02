import { Injectable } from '@nestjs/common';
import { LeadsService } from '../leads/leads.service';
import type { InboundEvent } from './webhook.events';
import { inboundRow, type RowInput } from './webhook.inbound';
import { WebhookQueries, type Contact } from './webhook.queries';

export interface LeadLink {
  id: string | null;
  /** The lead this message created (first message from an unknown number). */
  created: string | null;
  /** Follow-ups already sent; a reply starts the cadence over. */
  stage: number;
}

export interface Sender {
  who: Contact;
  lead: LeadLink;
}

/** Who wrote (guardian / teacher / lead, R-LEAD-01) and the stored inbound row. */
@Injectable()
export class InboundStore {
  constructor(
    private readonly queries: WebhookQueries,
    private readonly leads: LeadsService,
  ) {}

  /**
   * A guardian's or teacher's message never creates a lead (docs/12 §3.5); anyone else is upserted
   * (R-LEAD-01). upsertByPhone returns null for a job applicant (R-LEAD-04): no lead then.
   */
  async sender(input: { m: InboundEvent; phone: string }): Promise<Sender> {
    const { m, phone } = input;
    const who = await this.queries.identify(phone);
    const known = { id: who.lead?.id ?? null, created: null, stage: who.lead?.follow_up_stage ?? 0 };
    if (who.guardian || who.teacher) return { who, lead: known };
    const row = await this.leads.upsertByPhone({ phone, name: m.name, at: m.at });
    if (!row) return { who, lead: known };
    return { who, lead: { id: row.id, created: who.lead ? null : row.id, stage: row.follow_up_stage } };
  }

  /**
   * Inserts the row; false = Meta re-sent a wamid already stored (replay: no side effects). A new
   * message from a lead resets its follow-up stage (docs/12 §3.5).
   */
  async save(input: RowInput & { stage: number }): Promise<boolean> {
    const stored = await this.queries.insertInbound(inboundRow(input));
    if (stored && input.leadId && input.stage > 0) {
      await this.queries.updateLead(input.leadId, { follow_up_stage: 0 });
    }
    return stored;
  }

  /** Undoes save() when the side effects failed, so Meta's re-send of the wamid runs them again. */
  async forget(waMessageId: string): Promise<void> {
    await this.queries.deleteInbound(waMessageId);
  }
}
