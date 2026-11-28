import { waIdToE164, type CallEvent } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type {
  CallPermissionReplyEvent,
  CallWebhookEvent,
} from '@/modules/messaging/webhook';
import { CallsGate } from '@/modules/messaging/calls/access/calls-gate';
import { callingLine, type CallingLine } from '@/modules/messaging/calls/kapso/calling-line';
import type { CallRow } from '@/modules/messaging/calls/store/call-row';
import { logCallError } from './call-errors';
import {
  callerPhone,
  isInboundOffer,
  KIND_EVENTS,
  onLine,
  stillUpOnWhatsapp,
} from './call-webhook.mapper';
import { CallsKit } from './call-kit';
import { CallsNumberRepo } from '@/modules/messaging/calls/store/calls-number.repo';
import { CallsSweeper } from './calls.sweeper';

/** The port WebhookService calls for every parsed `calls` item (docs/28 §2). */
export interface CallEventsPort {
  handle(event: CallWebhookEvent): Promise<void>;
  /** A family's answer to a call permission request (docs/28 §10): stored with its expiry. */
  permissionReply(event: CallPermissionReplyEvent): Promise<void>;
}
export const CALL_EVENTS = Symbol('CALL_EVENTS');

interface RingingAt {
  line: CallingLine;
  phone: string;
  sdp: string;
}

const isUuid = (v: string | null): v is string => v !== null && z.uuid().safeParse(v).success;

/** The machine event a webhook item stands for; null = nothing to do (an inbound offer rings). */
export function machineEvent(e: CallWebhookEvent): CallEvent | null {
  return KIND_EVENTS[e.kind](e, e.at.toISOString());
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
    const line = callingLine();
    if (!line || !onLine(e, line)) return;
    if (isInboundOffer(e)) return this.ring(e, line);
    const row = await this.find(e);
    if (row) await this.move(row, e, line);
  }

  private async move(row: CallRow, e: CallWebhookEvent, line: CallingLine): Promise<void> {
    if (!row.wa_call_id) await this.kit.queries.setWaCallId(row.id, e.waCallId);
    const event = machineEvent(e);
    if (!event) return;
    if (stillUpOnWhatsapp(row, event)) return this.terminate(line, e.waCallId);
    await this.kit.apply(row, event);
  }

  /** Best effort, never a connect: a terminate is not billed. */
  private async terminate(line: CallingLine, waCallId: string): Promise<void> {
    await this.kit.api
      .terminate(line, waCallId)
      .catch((err: unknown) =>
        logCallError(this.log, { what: 'stray call terminate', callId: waCallId, error: err }),
      );
  }

  /** Our outbound call by its biz_opaque_callback_data (our id), else any call by its wacid. */
  private async find(e: CallWebhookEvent): Promise<CallRow | null> {
    if (isUuid(e.ref)) {
      const own = await this.kit.queries.get(e.ref);
      if (own?.direction === 'outbound' && (!own.wa_call_id || own.wa_call_id === e.waCallId))
        return own;
    }
    return this.kit.queries.byWaCallId(e.waCallId);
  }

  private async ring(e: CallWebhookEvent, line: CallingLine): Promise<void> {
    if (!(await this.gate.enabled()) || !e.sdp) return;
    if (await this.kit.queries.byWaCallId(e.waCallId)) return;
    const phone = callerPhone(e);
    if (!phone) {
      this.log.warn(`call ${e.waCallId}: the caller's wa_id is not a phone`);
      return;
    }
    await this.insertRinging(e, { line, phone, sdp: e.sdp });
    // The sweeper (on the worker) ends it as missed if its terminate webhook is lost.
    void this.sweeper.wake();
  }

  private async insertRinging(e: CallWebhookEvent, at: RingingAt): Promise<void> {
    const { line, phone } = at;
    const thread = await this.kit.threads.thread(phone);
    await this.kit.queries.insert({
      ...{
        direction: 'inbound',
        status: 'ringing',
        phone_e164: phone,
        wa_call_id: e.waCallId,
        offer_sdp: at.sdp,
      },
      ...{
        number_id: line.numberId,
        guardian_id: thread?.guardian_id ?? null,
        lead_id: thread?.lead_id ?? null,
      },
      started_at: e.at.toISOString(),
    });
  }
}
