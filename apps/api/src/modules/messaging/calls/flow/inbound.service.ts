import type { ActiveCallView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { conflict, notFound } from '../../../../common/http/errors';
import { maySee, type CallActor } from '../access/call-access';
import { CallsGate } from '../access/calls-gate';
import { toActiveView } from '../store/calls.mapper';
import type { CallRow } from '../store/call-row';
import { callFailed, logCallError } from './call-errors';
import { CallsKit } from './call-kit';
import { isPartyOf } from './outbound.service';

/**
 * Family → academy (docs/28 §3.2). Every staff member who may write in that chat sees it ring; the
 * first «قبول» wins (compare-and-set ringing → accepting with accepted_by), the others stop ringing
 * because the row left `ringing`. Accept = pre_accept then accept with the answering device's SDP.
 */
@Injectable()
export class InboundCalls {
  private readonly log = new Logger(InboundCalls.name);

  constructor(
    private readonly kit: CallsKit,
    private readonly gate: CallsGate,
  ) {}

  async accept(actor: CallActor, input: { id: string; sdp: string }): Promise<ActiveCallView> {
    const row = await this.ringing(actor, input.id);
    const line = this.gate.line();
    const userId = actor.user.id;
    if ((await this.kit.queries.live()).some((c) => c.id !== row.id && isPartyOf(c, userId))) throw conflict('call_busy');
    const claimed = await this.kit.apply(row, { type: 'claim' }, { accepted_by: userId });
    if (!claimed) throw conflict('already_taken');
    try {
      await this.kit.api.accept(line, { waCallId: row.wa_call_id, sdp: input.sdp, ref: row.id });
    } catch (e) {
      const code = logCallError(this.log, { what: 'accept', callId: row.id, error: e });
      await this.kit.apply(claimed, { type: 'hangup', at: new Date().toISOString(), reason: 'failed' }, { error_code: code });
      throw callFailed(code);
    }
    const active = await this.kit.apply(claimed, { type: 'accepted', at: new Date().toISOString() });
    // The family hung up while we accepted: the terminate webhook ended it first.
    if (!active) throw conflict('call_ended');
    return toActiveView(active, { names: await this.kit.names([active]), userId });
  }

  /** «رفض»: WhatsApp's reject, then the row ends as declined; every other screen stops ringing. */
  async reject(actor: CallActor, id: string): Promise<ActiveCallView> {
    const row = await this.ringing(actor, id);
    await this.kit.api.reject(this.gate.line(), row.wa_call_id).catch((e: unknown) => logCallError(this.log, { what: 'reject', callId: id, error: e }));
    const ended = await this.kit.apply(row, { type: 'hangup', at: new Date().toISOString(), reason: 'declined' });
    const final = ended ?? (await this.kit.queries.get(id)) ?? row;
    return toActiveView(final, { names: await this.kit.names([final]), userId: actor.user.id });
  }

  /** The visible, still ringing inbound call; 404 call_not_found / 409 already_taken otherwise. */
  private async ringing(actor: CallActor, id: string): Promise<CallRow & { wa_call_id: string }> {
    await this.gate.assertOn();
    const row = await this.kit.queries.get(id);
    if (!row || row.direction !== 'inbound' || !maySee(actor, row.phone_e164)) throw notFound('call_not_found');
    if (row.status === 'ended') throw conflict('call_ended');
    if (row.status !== 'ringing' || !row.wa_call_id) throw conflict('already_taken');
    return { ...row, wa_call_id: row.wa_call_id };
  }
}
