import { callsRoutes as routes } from '@ab/shared';
import { Controller, HttpCode, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, type RouteInputOf } from '@/common/http/route';
import { ZodBody } from '@/common/http/zod-inputs';
import { recordSend } from '@/modules/messaging/inbox/send/send-audit';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { CallAccess } from '@/modules/messaging/calls/access/call-access';
import { CallPermissions } from '@/modules/messaging/calls/flow/call-permission.service';

/** The request is a staff send through the outbox, audited (docs/28 §3.1). */
@ApiBearerAuth()
@Controller()
export class CallPermissionController {
  constructor(
    private readonly permissions: CallPermissions,
    private readonly access: CallAccess,
    private readonly audit: AuditService,
  ) {}

  // The actor's 403/404 still win over a bad phone, so the phone is read after it.
  @Route(routes.permission)
  async state(@Param('phone') raw: string, @CurrentUser() user: AuthUser) {
    return this.permissions.state(await this.access.actor(user), phoneParam(raw));
  }

  @Route(routes.permissionRequest)
  @HttpCode(201)
  async request(
    @Param('phone') raw: string,
    @ZodBody(routes.permissionRequest.body) {
      clientRequestId,
    }: RouteInputOf<typeof routes.permissionRequest>['body'],
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
