import type { CallPermissionView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { ar } from '@/common/infra/i18n/server-text';
import { Outbox, type Sent } from '@/modules/messaging/inbox/send/outbox';
import { pickSend, type SendPick } from '@/modules/messaging/inbox/send/send-number';
import { dedupKey, outboundBase } from '@/modules/messaging/inbox/send/thread-send.service';
import { assertMayCall, type CallActor } from '@/modules/messaging/calls/access/call-access';
import type { CallingLine } from '@/modules/messaging/calls/kapso/calling-line';
import { CALL_PERMISSION_PAYLOAD } from '@/modules/messaging/whatsapp/messages/wa-call-permission';
import { callFailed, logCallError } from './call-errors';
import { CallsKit } from './call-kit';
import { CallsNumberPermission } from './calls-number-permission';

/** The reply window of the CALLING number is open: a session message may go from it now. */
export function fromCallingNumber(pick: SendPick, line: CallingLine): pick is { line?: 'chat'; number_id?: string } {
  if ('code' in pick) return false;
  return line.numberId ? pick.number_id === line.numberId : pick.line === 'chat';
}

/**
 * Call permission (docs/28 §3.1): Kapso's call_permissions decides; a missing permission inside the
 * calling number's 24 h window offers «اطلب إذن الاتصال», an interactive call_permission_request sent
 * through the ordinary outbox (send gate, allow-list, dedupe, audit) as a staff send. Outside the
 * window only an approved call-permission template could ask: never created or submitted from here.
 * A dedicated calls number (docs/28 §10) asks from ITSELF instead (CallsNumberPermission).
 */
@Injectable()
export class CallPermissions {
  private readonly log = new Logger(CallPermissions.name);

  constructor(
    private readonly kit: CallsKit,
    private readonly outbox: Outbox,
    private readonly calls: CallsNumberPermission,
  ) {}

  private get gate() {
    return this.calls.gate;
  }

  async state(actor: CallActor, phone: string, now = new Date()): Promise<CallPermissionView> {
    await this.gate.assertOn();
    const line = this.gate.line();
    assertMayCall(actor, phone);
    this.gate.assertRecipient(phone);
    const facts = await this.kit.api.permission(line, phone).catch((e: unknown) => {
      throw callFailed(logCallError(this.log, { what: 'permission check', callId: 'permission', error: e }));
    });
    if (line.calls) return this.calls.state({ line, phone, facts, now });
    if (facts.canCall) return { state: 'granted', expires_at: facts.expiresAt };
    if (!facts.canRequest) return { state: 'limited', expires_at: null };
    const open = fromCallingNumber(await this.pick(phone, now), line);
    return { state: open ? 'request' : 'needs_template', expires_at: null };
  }

  /** «اطلب إذن الاتصال»: 409 with the state when it is not `request` (granted, needs_template, limited). */
  async request(actor: CallActor, input: { phone: string; clientRequestId: string }, now = new Date()): Promise<Sent> {
    const state = await this.state(actor, input.phone, now);
    if (state.state !== 'request') throw conflict(`permission_${state.state}`);
    const line = this.gate.line();
    if (line.calls) return this.calls.send({ actor, input, line, via: state.via ?? 'interactive' });
    const pick = await this.pick(input.phone, now);
    if (!fromCallingNumber(pick, line)) throw conflict('permission_needs_template');
    const send = { phone: input.phone, input, actorId: actor.user.id, scope: actor.teacher, sales: actor.sales };
    const thread = await this.kit.threads.thread(input.phone);
    return this.outbox.send({
      ...outboundBase(send, thread),
      ...pick,
      dedup_key: `call_permission:${dedupKey(send)}`,
      body: ar.calls.permission.requestBody,
      interactive_payload: CALL_PERMISSION_PAYLOAD,
    });
  }

  private async pick(phone: string, now: Date): Promise<SendPick> {
    const thread = await this.kit.threads.thread(phone);
    return pickSend({ thread, now, windows: () => this.kit.threads.numberWindows(phone) });
  }
}
