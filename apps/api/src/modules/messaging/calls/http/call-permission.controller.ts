import { phoneE164 } from '@ab/core';
import { callPermissionRequestSchema } from '@ab/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { invalidPhone, recordSend } from '@/modules/messaging/inbox';
import { CallAccess } from '@/modules/messaging/calls/access/call-access';
import { CallPermissions } from '@/modules/messaging/calls/flow/call-permission.service';

type RequestBody = z.output<typeof callPermissionRequestSchema>;

/** The request is a staff send through the outbox, audited (docs/28 §3.1). */
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
  async state(
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.permissions.state(await this.access.actor(user), phone);
  }

  @Post(':phone/request')
  @HttpCode(201)
  async request(
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @ZodBody(callPermissionRequestSchema) { clientRequestId }: RequestBody,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.access.actor(user);
    const sent = await this.permissions.request(actor, { phone, clientRequestId });
    return recordSend(this.audit, {
      sent,
      action: 'call_permission_request',
      user,
      scope: actor.teacher,
      sales: actor.sales,
    });
  }
}
