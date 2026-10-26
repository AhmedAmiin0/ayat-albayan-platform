import type { ActiveCallView, CallConfigView, CallView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { can } from '../../../../common/auth/permissions';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { iceServers, loadEnv } from '../../../../config/env/env';
import { maySee, phonesOf, type CallActor } from '../access/call-access';
import { CallsGate } from '../access/calls-gate';
import { callingLine } from '../kapso/calling-line';
import { toActiveView, toCallView } from '../store/calls.mapper';
import type { CallRow } from '../store/call-row';
import { CallsKit } from './call-kit';

/** A live row this user's device should show: their own call, or an inbound one ringing in a chat they may answer (inbox.send). */
export function showsLive(row: CallRow, actor: CallActor): boolean {
  const me = actor.user.id;
  if (row.direction === 'outbound') return row.created_by === me;
  if (row.accepted_by === me) return true;
  return row.status === 'ringing' && can(actor.user, 'inbox.send') && maySee(actor, row.phone_e164);
}

/** GET /calls/config, /calls/active, /calls (docs/28 §4). */
@Injectable()
export class CallReads {
  constructor(
    private readonly kit: CallsKit,
    private readonly gate: CallsGate,
  ) {}

  /** Always answers (the clients decide from it whether to show the phone icon); ICE only to callers. */
  async config(user: AuthUser): Promise<CallConfigView> {
    const enabled = await this.gate.enabled();
    const canCall = can(user, 'inbox.send');
    return { enabled, available: callingLine() !== null, canCall, iceServers: enabled && canCall ? iceServers(loadEnv(), { userId: user.id, now: new Date() }) : [] };
  }

  /** The incoming-call screen and the caller's own call: SDPs to the parties only (calls.mapper.ts). */
  async active(actor: CallActor): Promise<ActiveCallView[]> {
    await this.gate.assertOn();
    const rows = (await this.kit.queries.live()).filter((r) => showsLive(r, actor));
    const names = await this.kit.names(rows);
    return rows.map((r) => toActiveView(r, { names, userId: actor.user.id }));
  }

  /** The calls log (newest first), or one chat's calls for its log; a teacher sees their families' only. */
  async list(actor: CallActor, q: { phone?: string | undefined; limit: number }): Promise<CallView[]> {
    await this.gate.assertOn();
    if (q.phone && !maySee(actor, q.phone)) return [];
    const rows = await this.kit.queries.list({ ...q, phones: phonesOf(actor) });
    const visible = rows.filter((r) => maySee(actor, r.phone_e164));
    const names = await this.kit.names(visible);
    return visible.map((r) => toCallView(r, names));
  }
}
