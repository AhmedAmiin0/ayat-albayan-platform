import {
  acceptCallSchema,
  callListQuerySchema,
  startCallSchema,
  type ActiveCallView,
} from '@ab/shared';
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { ZodBody } from '@/common/http/zod-inputs';
import { CallAccess } from '@/modules/messaging/calls/access/call-access';
import { CallReads } from '@/modules/messaging/calls/flow/call-reads.service';
import { CallFlows } from '@/modules/messaging/calls/flow/call-flows';

type StartBody = z.output<typeof startCallSchema>;
type AcceptBody = z.output<typeof acceptCallSchema>;

/**
 * WhatsApp voice calls (docs/28 §4). Reads need inbox.read, every action inbox.send (the same guard
 * as a send from the thread, and the same scopes: CallAccess). Off (whatsapp_calls_enabled false):
 * every route but /calls/config answers 404 calls_disabled.
 */
@ApiTags('calls')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('calls')
export class CallsController {
  constructor(
    private readonly reads: CallReads,
    private readonly flows: CallFlows,
    private readonly access: CallAccess,
  ) {}

  @Get('config')
  config(@CurrentUser() user: AuthUser) {
    return this.reads.config(user);
  }

  @Get('active')
  async active(@CurrentUser() user: AuthUser) {
    return this.reads.active(await this.access.actor(user));
  }

  @Get()
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    // The actor's 403/404 (TeacherScopes) still win over a bad query: parsed after it.
    const actor = await this.access.actor(user);
    return this.reads.list(actor, parseOrThrow(callListQuerySchema, query));
  }

  @Post()
  @HttpCode(201)
  @Permissions('inbox.send')
  async start(@ZodBody(startCallSchema) input: StartBody, @CurrentUser() user: AuthUser) {
    const call = await this.flows.outbound.start(await this.access.actor(user), input);
    return this.audited(call, { user, action: 'wa_call_started' });
  }

  @Post(':id/accept')
  @HttpCode(200)
  @Permissions('inbox.send')
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(acceptCallSchema) { sdp }: AcceptBody,
    @CurrentUser() user: AuthUser,
  ) {
    const call = await this.flows.inbound.accept(await this.access.actor(user), { id, sdp });
    return this.audited(call, { user, action: 'wa_call_accepted' });
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Permissions('inbox.send')
  async reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.flows.inbound.reject(await this.access.actor(user), id);
  }

  @Post(':id/end')
  @HttpCode(200)
  @Permissions('inbox.send')
  async end(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.flows.outbound.end(await this.access.actor(user), id);
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
