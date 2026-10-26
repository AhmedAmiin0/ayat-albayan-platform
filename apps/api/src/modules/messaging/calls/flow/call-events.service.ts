import { waIdToE164, type CallEvent } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { CallWebhookEvent } from '../../webhook/webhook.events';
import { CallsGate } from '../access/calls-gate';
import { callingLine, type CallingLine } from '../kapso/calling-line';
import type { CallRow } from '../store/call-row';
import { CallsKit } from './call-kit';

/** The port WebhookService calls for every parsed `calls` item (docs/28 §2). */
export interface CallEventsPort {
  handle(event: CallWebhookEvent): Promise<void>;
}
export const CALL_EVENTS = Symbol('CALL_EVENTS');

const isUuid = (v: string | null): v is string => v !== null && z.uuid().safeParse(v).success;

/** The machine event a webhook item stands for; null = nothing to do (an inbound offer is handled apart). */
export function machineEvent(e: CallWebhookEvent): CallEvent | null {
  const at = e.at.toISOString();
  if (e.kind === 'terminate') return { type: 'terminate', at, failed: e.status === 'FAILED', duration: e.duration };
  if (e.kind === 'connect') return e.direction === 'outbound' && e.sdp ? { type: 'answer_sdp', sdp: e.sdp } : null;
  if (e.status === 'RINGING') return { type: 'ringing' };
  if (e.status === 'ACCEPTED') return { type: 'accepted', at };
  return e.status === 'REJECTED' ? { type: 'rejected', at } : null;
}

/**
 * Webhook → wa_calls. Only the calling number's items count (the chat line on Kapso). An inbound
 * offer rings (a new `ringing` row, deduped by its wacid) only while calls are on; every other item
 * moves an existing row through the state machine, so duplicates and late items are ignored.
 * Nothing here calls Kapso.
 */
@Injectable()
export class CallEvents implements CallEventsPort {
  private readonly log = new Logger(CallEvents.name);

  constructor(
    private readonly kit: CallsKit,
    private readonly gate: CallsGate,
  ) {}

  async handle(e: CallWebhookEvent): Promise<void> {
    const line = callingLine();
    if (!line || (e.phoneNumberId !== null && e.phoneNumberId !== line.env.phoneNumberId)) return;
    if (e.kind === 'connect' && e.direction === 'inbound') return this.ring(e, line);
    const row = await this.find(e);
    if (!row) return;
    if (!row.wa_call_id) await this.kit.queries.setWaCallId(row.id, e.waCallId);
    const event = machineEvent(e);
    if (event) await this.kit.apply(row, event);
  }

  /** Our outbound call by its biz_opaque_callback_data (our id), else any call by its wacid. */
  private async find(e: CallWebhookEvent): Promise<CallRow | null> {
    if (isUuid(e.ref)) {
      const own = await this.kit.queries.get(e.ref);
      if (own && own.direction === 'outbound' && (!own.wa_call_id || own.wa_call_id === e.waCallId)) return own;
    }
    return this.kit.queries.byWaCallId(e.waCallId);
  }

  private async ring(e: CallWebhookEvent, line: CallingLine): Promise<void> {
    if (!(await this.gate.enabled()) || !e.sdp) return;
    if (await this.kit.queries.byWaCallId(e.waCallId)) return;
    const phone = e.peer ? waIdToE164(e.peer) : null;
    if (!phone) return void this.log.warn(`call ${e.waCallId}: the caller's wa_id is not a phone`);
    const thread = await this.kit.threads.thread(phone);
    await this.kit.queries.insert({
      ...{ direction: 'inbound', status: 'ringing', phone_e164: phone, wa_call_id: e.waCallId, offer_sdp: e.sdp },
      ...{ number_id: line.numberId, guardian_id: thread?.guardian_id ?? null, lead_id: thread?.lead_id ?? null },
      started_at: e.at.toISOString(),
    });
  }
}
