import { waIdToE164 } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { CallPermissionReplyEvent, CallWebhookEvent } from '@/modules/messaging/webhook';
import { CallsGate } from '@/modules/messaging/calls/access/calls-gate';
import { callingLine, type CallingLine } from '@/modules/messaging/calls/kapso/calling-line';
import type { CallRow } from '@/modules/messaging/calls/store/call-row';
import { logCallError } from './call-errors';
import { CallsKit } from './call-kit';
import { CallsNumberRepo } from '@/modules/messaging/calls/store/calls-number.repo';
import { CallsSweeper } from './calls.sweeper';
import { machineEvent, stillUpOnWhatsapp } from './call-machine-event';

export { machineEvent } from './call-machine-event';

/** The port WebhookService calls for every parsed `calls` item (docs/28 §2). */
export interface CallEventsPort {
  handle(event: CallWebhookEvent): Promise<void>;
  /** A family's answer to a call permission request (docs/28 §10): stored with its expiry. */
  permissionReply(event: CallPermissionReplyEvent): Promise<void>;
}
export const CALL_EVENTS = Symbol('CALL_EVENTS');

const isUuid = (v: string | null): v is string => v !== null && z.uuid().safeParse(v).success;

/** The calling line, only when the item is for its number (Meta may leave the number out). */
function lineFor(e: CallWebhookEvent): CallingLine | null {
  const line = callingLine();
  const ours = e.phoneNumberId === null || e.phoneNumberId === line?.env.phoneNumberId;
  return ours ? line : null;
}

const isInboundOffer = (e: CallWebhookEvent): boolean =>
  e.kind === 'connect' && e.direction === 'inbound';

/** Our outbound call, unless it already names another wacid. */
const isOwnCall = (own: CallRow | null, e: CallWebhookEvent): own is CallRow =>
  own?.direction === 'outbound' && (!own.wa_call_id || own.wa_call_id === e.waCallId);

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
    private readonly sweeper: CallsSweeper,
    private readonly permissions: CallsNumberRepo,
  ) {}

  /**
   * Stored whatever the setting says (it only records the family's own answer); never a send, never
   * Kapso.
   */
  async permissionReply(e: CallPermissionReplyEvent): Promise<void> {
    const phone = waIdToE164(e.from);
    if (!phone) {
      this.log.warn(`call permission reply: the wa_id is not a phone`);
      return;
    }
    await this.permissions.saveReply({
      phoneNumberId: e.phoneNumberId,
      phone,
      response: e.response,
      expiresAt: e.expiresAt,
      at: e.at,
    });
  }

  async handle(e: CallWebhookEvent): Promise<void> {
    const line = lineFor(e);
    if (!line) return;
    await (isInboundOffer(e) ? this.ring(e, line) : this.track(e, line));
  }

  /** Moves the call's row through the machine (naming its wacid first when it has none yet). */
  private async track(e: CallWebhookEvent, line: CallingLine): Promise<void> {
    const row = await this.find(e);
    if (!row) return;
    if (!row.wa_call_id) await this.kit.queries.setWaCallId(row.id, e.waCallId);
    await this.step(row, e, line);
  }

  /** The item's machine event; a call still up on WhatsApp is ended there. */
  private async step(row: CallRow, e: CallWebhookEvent, line: CallingLine): Promise<void> {
    const event = machineEvent(e);
    if (!event) return;
    const stillUp = stillUpOnWhatsapp(row, event);
    await (stillUp ? this.terminate(line, e.waCallId) : this.kit.apply(row, event));
  }

  /** Best effort, never a connect: a terminate is not billed. */
  private async terminate(line: CallingLine, waCallId: string): Promise<void> {
    await this.kit.api.terminate(line, waCallId).catch((err: unknown) => logCallError(this.log, { what: 'stray call terminate', callId: waCallId, error: err }));
  }

  /** Our outbound call by its biz_opaque_callback_data (our id), else any call by its wacid. */
  private async find(e: CallWebhookEvent): Promise<CallRow | null> {
    const own = isUuid(e.ref) ? await this.kit.queries.get(e.ref) : null;
    return isOwnCall(own, e) ? own : this.kit.queries.byWaCallId(e.waCallId);
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
    // The sweeper (on the worker) ends it as missed if its terminate webhook is lost.
    void this.sweeper.wake();
  }
}
