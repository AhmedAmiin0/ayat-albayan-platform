import { sessionWindowOpen, type CallPermissionReply, type CallPermissionView, type CallPermissionVia } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { conflict } from '../../../../common/http/errors';
import { ar } from '../../../../common/i18n/server-text';
import { dedupKey, outboundBase, type Sent } from '../../inbox';
import { CALL_PERMISSION_PAYLOAD } from '../../whatsapp';
import type { CallActor } from '../access/call-access';
import { CallsGate } from '../access/calls-gate';
import type { CallingLine } from '../kapso/calling-line';
import type { CallPermissionFacts } from '../kapso/calls-api';
import { CallsNumberStore } from '../store/calls-number.store';
import { logCallError, requestFailed } from './call-errors';
import { CallsKit } from './call-kit';

/** Marks the row while its one request is in flight (the sender never reads a calls-number row anyway). */
const IN_FLIGHT = 'sending';

/** What a request from the calls number needs: who taps, for whom, and how it asks. */
interface CallsNumberRequest {
  actor: CallActor;
  input: { phone: string; clientRequestId: string };
  line: CallingLine;
  via: CallPermissionVia;
}

/**
 * Call permission on the dedicated calls number (docs/28 §10). Kapso's call_permissions decides
 * granted / limited; the family's stored answer (wa_call_permissions) is shown beside it. A request is
 * sent ONLY on a staff member's tap of «اطلب إذن الاتصال», FROM the calls number: the interactive request
 * inside ITS 24 h window, else the approved template of calls_permission_template (unset = needs_template,
 * the button disabled with the reason). It passes the send gate (messaging_enabled) and the allow-list
 * (CallPermissions checks it first), is deduped by the tap's request id and makes ONE request, never
 * retried; its messages row (line `calls`) shows in the thread and is never read by the sender.
 */
@Injectable()
export class CallsNumberPermission {
  private readonly log = new Logger(CallsNumberPermission.name);

  constructor(
    private readonly kit: CallsKit,
    readonly gate: CallsGate,
    private readonly store: CallsNumberStore,
  ) {}

  async state(input: { line: CallingLine; phone: string; facts: CallPermissionFacts; now: Date }): Promise<CallPermissionView> {
    const { line, phone, facts } = input;
    const reply = await this.store.reply(line.env.phoneNumberId, phone);
    if (facts.canCall) return { state: 'granted', expires_at: facts.expiresAt ?? grantExpiry(reply), reply };
    if (!facts.canRequest) return { state: 'limited', expires_at: null, reply };
    if (sessionWindowOpen(await this.store.lastInbound(phone), input.now)) return { state: 'request', via: 'interactive', expires_at: null, reply };
    if (await this.gate.permissionTemplate()) return { state: 'request', via: 'template', expires_at: null, reply };
    return { state: 'needs_template', via: 'template', expires_at: null, reply };
  }

  async send(req: CallsNumberRequest): Promise<Sent> {
    if (!(await this.gate.messagingOpen())) throw conflict('messaging_off');
    const template = req.via === 'template' ? await this.gate.permissionTemplate() : null;
    if (req.via === 'template' && !template) throw conflict('permission_needs_template');
    const { actor, input, line } = req;
    const send = { phone: input.phone, input, actorId: actor.user.id, scope: actor.teacher, sales: actor.sales };
    const body = ar.calls.permission.requestBody;
    const row = await this.kit.threads.enqueue({
      ...outboundBase(send, await this.kit.threads.thread(input.phone)),
      ...{ direction: 'outbound', status: 'queued', line: 'calls', number_id: line.numberId, error_code: IN_FLIGHT },
      ...{ dedup_key: `call_permission:${dedupKey(send)}`, body, interactive_payload: { ...CALL_PERMISSION_PAYLOAD, via: req.via } },
    });
    if (row.replayed) return { view: await this.store.view(row), replayed: true };
    const to = input.phone;
    try {
      const { waMessageId } = await this.kit.api.requestPermission(line, template ? { to, template } : { to, text: body });
      return { view: await this.store.view((await this.store.sent(row.id, waMessageId)) ?? row), replayed: false };
    } catch (e) {
      const code = logCallError(this.log, { what: 'permission request', callId: row.id, error: e });
      await this.store.failed(row.id, code);
      throw requestFailed(code);
    }
  }
}

/** The stored grant's expiry when Kapso gave none (accepted only). */
const grantExpiry = (reply: CallPermissionReply | null): string | null => (reply?.response === 'accepted' ? reply.expires_at : null);
