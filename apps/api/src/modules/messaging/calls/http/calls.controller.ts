import { acceptCallSchema, callListQuerySchema, startCallSchema, type ActiveCallView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { CallAccess } from '../access/call-access';
import { CallReads } from '../flow/call-reads.service';
import { CallFlows } from '../flow/call-flows';

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
    return this.reads.list(await this.access.actor(user), parseOrThrow(callListQuerySchema, query));
  }

  @Post()
  @HttpCode(201)
  @Permissions('inbox.send')
  async start(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = parseOrThrow(startCallSchema, body);
    const call = await this.flows.outbound.start(await this.access.actor(user), input);
    return this.audited(call, { user, action: 'wa_call_started' });
  }

  @Post(':id/accept')
  @HttpCode(200)
  @Permissions('inbox.send')
  async accept(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { sdp } = parseOrThrow(acceptCallSchema, body);
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
  private async audited(call: ActiveCallView, at: { user: AuthUser; action: string }): Promise<ActiveCallView> {
    const after = { direction: call.direction, status: call.status };
    await this.flows.audit.record({ actorId: at.user.id, entity: 'wa_calls', entityId: call.id, action: at.action, before: null, after });
    return call;
  }
}
