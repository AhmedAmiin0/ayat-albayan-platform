import type { ActiveCallView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { conflict, notFound } from '../../../../common/http/errors';
import { assertMayCall, type CallActor } from '../access/call-access';
import { CallsGate } from '../access/calls-gate';
import type { CallingLine } from '../kapso/calling-line';
import { toActiveView } from '../store/calls.mapper';
import type { CallRow } from '../store/call-row';
import { callFailed, logCallError } from './call-errors';
import { CallsKit } from './call-kit';

/** Is this live row one the user is in (placed it, or took it)? */
export const isPartyOf = (row: CallRow, userId: string): boolean => row.created_by === userId || row.accepted_by === userId;

/**
 * Staff → family (docs/28 §3.1). The row is written BEFORE Kapso hears of the call (its id is the
 * biz_opaque_callback_data), and the connect is sent exactly once: a failed or timed-out connect ends
 * the row as failed and is never retried (it may already ring, and business calls are billed).
 */
@Injectable()
export class OutboundCalls {
  private readonly log = new Logger(OutboundCalls.name);

  constructor(
    private readonly kit: CallsKit,
    private readonly gate: CallsGate,
  ) {}

  async start(actor: CallActor, input: { phone: string; sdp: string; clientRequestId: string }): Promise<ActiveCallView> {
    const line = await this.allowed(actor, input.phone);
    const userId = actor.user.id;
    const again = await this.kit.queries.byRequest(userId, input.clientRequestId);
    if (again) return this.view(again, userId);
    if ((await this.kit.queries.live()).some((c) => isPartyOf(c, userId))) throw conflict('call_busy');
    const permission = await this.kit.api.permission(line, input.phone).catch((e: unknown) => {
      throw callFailed(logCallError(this.log, { what: 'permission check', callId: 'new', error: e }));
    });
    if (!permission.canCall) throw conflict('no_permission');
    const row = await this.insert({ ...input, line, userId });
    // A double tap raced us to the unique request key: answer with that first call.
    if (!row) return this.view(await this.mustGet(userId, input.clientRequestId), userId);
    try {
      const { waCallId } = await this.kit.api.connect(line, { to: input.phone, sdp: input.sdp, ref: row.id });
      await this.kit.queries.setWaCallId(row.id, waCallId);
    } catch (e) {
      const code = logCallError(this.log, { what: 'connect', callId: row.id, error: e });
      await this.kit.apply(row, { type: 'hangup', at: new Date().toISOString(), reason: 'failed' }, { error_code: code });
      throw callFailed(code);
    }
    return this.view((await this.kit.queries.get(row.id)) ?? row, userId);
  }

  /** «إنهاء» by the person in the call (either direction): terminate on WhatsApp, then end the row. */
  async end(actor: CallActor, id: string): Promise<ActiveCallView> {
    await this.gate.assertOn();
    const row = await this.kit.queries.get(id);
    if (!row || !isPartyOf(row, actor.user.id)) throw notFound('call_not_found');
    if (row.status === 'ended') return this.view(row, actor.user.id);
    const line = row.wa_call_id ? this.gate.line() : null;
    if (line && row.wa_call_id) {
      await this.kit.api.terminate(line, row.wa_call_id).catch((e: unknown) => logCallError(this.log, { what: 'terminate', callId: id, error: e }));
    }
    const ended = await this.kit.apply(row, { type: 'hangup', at: new Date().toISOString() });
    return this.view(ended ?? (await this.kit.queries.get(id)) ?? row, actor.user.id);
  }

  /** The connecting row, linked to the chat's guardian / lead; null = that request id exists already. */
  private async insert(input: { phone: string; sdp: string; clientRequestId: string; line: CallingLine; userId: string }): Promise<CallRow | null> {
    const thread = await this.kit.threads.thread(input.phone);
    return this.kit.queries.insert({
      ...{ phone_e164: input.phone, direction: 'outbound', status: 'connecting', offer_sdp: input.sdp },
      ...{ number_id: input.line.numberId, guardian_id: thread?.guardian_id ?? null, lead_id: thread?.lead_id ?? null },
      ...{ created_by: input.userId, client_request_id: input.clientRequestId },
    });
  }

  /** Calls on, the chat line on Kapso, this chat theirs to write in and the number on the allow-list. */
  private async allowed(actor: CallActor, phone: string): Promise<CallingLine> {
    await this.gate.assertOn();
    const line = this.gate.line();
    assertMayCall(actor, phone);
    this.gate.assertRecipient(phone);
    return line;
  }

  private async mustGet(userId: string, requestId: string): Promise<CallRow> {
    const row = await this.kit.queries.byRequest(userId, requestId);
    if (!row) throw conflict('call_busy');
    return row;
  }

  private async view(row: CallRow, userId: string): Promise<ActiveCallView> {
    return toActiveView(row, { names: await this.kit.names([row]), userId });
  }
}
