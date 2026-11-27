import { callsRoutes as routes, type ActiveCallView } from '@ab/shared';
import { Controller, HttpCode, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CallAccess } from '@/modules/messaging/calls/access/call-access';
import { CallReads } from '@/modules/messaging/calls/flow/call-reads.service';
import { CallFlows } from '@/modules/messaging/calls/flow/call-flows';

/**
 * WhatsApp voice calls (docs/28 §4). Reads need inbox.read, every action inbox.send (the same guard
 * as a send from the thread, and the same scopes: CallAccess). Off (whatsapp_calls_enabled false):
 * every route but /calls/config answers 404 calls_disabled.
 */
@ApiBearerAuth()
@Controller()
export class CallsController {
  constructor(
    private readonly reads: CallReads,
    private readonly flows: CallFlows,
    private readonly access: CallAccess,
  ) {}

  @Route(routes.config)
  config(@CurrentUser() user: AuthUser) {
    return this.reads.config(user);
  }

  @Route(routes.active)
  async active(@CurrentUser() user: AuthUser) {
    return this.reads.active(await this.access.actor(user));
  }

  // The actor's 403/404 (TeacherScopes) still win over a bad query, so the query is parsed in the
  // handler after it; @RouteInput() would parse it first.
  @Route(routes.list)
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    const actor = await this.access.actor(user);
    return this.reads.list(actor, parseOrThrow(routes.list.query, query));
  }

  @Route(routes.start)
  @HttpCode(201)
  async start(
    @RouteInput() { body }: RouteInputOf<typeof routes.start>,
    @CurrentUser() user: AuthUser,
  ) {
    const call = await this.flows.outbound.start(await this.access.actor(user), body);
    return this.audited(call, { user, action: 'wa_call_started' });
  }

  @Route(routes.accept)
  @HttpCode(200)
  async accept(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.accept>,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.access.actor(user);
    const call = await this.flows.inbound.accept(actor, { id: params.id, sdp: body.sdp });
    return this.audited(call, { user, action: 'wa_call_accepted' });
  }

  @Route(routes.reject)
  @HttpCode(200)
  async reject(
    @RouteInput() { params }: RouteInputOf<typeof routes.reject>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.flows.inbound.reject(await this.access.actor(user), params.id);
  }

  @Route(routes.end)
  @HttpCode(200)
  async end(
    @RouteInput() { params }: RouteInputOf<typeof routes.end>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.flows.outbound.end(await this.access.actor(user), params.id);
  }

  /** Who placed or took a call is logged by the call id and direction only (no phone, no SDP). */
  private async audited(
    call: ActiveCallView,
    at: { user: AuthUser; action: string },
  ): Promise<ActiveCallView> {
    const after = { direction: call.direction, status: call.status };
    await this.flows.audit.record({
      actorId: at.user.id,
      entity: 'wa_calls',
      entityId: call.id,
      action: at.action,
      before: null,
      after,
    });
    return call;
  }
}
