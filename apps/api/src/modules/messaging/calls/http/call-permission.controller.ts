import { callPermissionRequestSchema } from '@ab/shared';
import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { recordSend } from '@/modules/messaging/inbox/send/send-audit';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { CallAccess } from '@/modules/messaging/calls/access/call-access';
import { CallPermissions } from '@/modules/messaging/calls/flow/call-permission.service';

type RequestBody = z.output<typeof callPermissionRequestSchema>;

/**
 * GET /calls/permission/:phone (may the academy call this number now?) and «اطلب إذن الاتصال»
 * (docs/28 §3.1): a staff send through the outbox, audited like every send from the thread.
 */
@ApiTags('calls')
@ApiBearerAuth()
@Permissions('inbox.send')
@Controller('calls/permission')
export class CallPermissionController {
  constructor(
    private readonly permissions: CallPermissions,
    private readonly access: CallAccess,
    private readonly audit: AuditService,
  ) {}

  @Get(':phone')
  async state(@Param('phone') raw: string, @CurrentUser() user: AuthUser) {
    return this.permissions.state(await this.access.actor(user), phoneParam(raw));
  }

  @Post(':phone/request')
  @HttpCode(201)
  async request(
    @Param('phone') raw: string,
    @ZodBody(callPermissionRequestSchema) { clientRequestId }: RequestBody,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.access.actor(user);
    const sent = await this.permissions.request(actor, { phone: phoneParam(raw), clientRequestId });
    return recordSend(this.audit, {
      sent,
      action: 'call_permission_request',
      user,
      scope: actor.teacher,
      sales: actor.sales,
    });
  }
}
