import { lessonRatingRoutes as routes, type MessageView } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, type RouteInputOf } from '@/common/http/route';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { RatingSendService } from './rating.send.service';

type Body = RouteInputOf<typeof routes.send>['body'];

/** A bad body is 400 validation_failed before a bad phone's 400 invalid_phone. */
@ApiBearerAuth()
@Controller()
export class RatingController {
  constructor(
    private readonly sends: RatingSendService,
    private readonly audit: AuditService,
  ) {}

  @Route(routes.send)
  @HttpCode(201)
  async send(
    @ZodParam('phone', routes.send.params.shape.phone, invalidPhone) phone: string,
    @ZodBody(routes.send.body) body: Body,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const { clientRequestId } = body;
    const { view, replayed } = await this.sends.send({
      phone,
      actorId: user.id,
      clientRequestId,
    });
    if (replayed) return view;
    await this.audit.record({
      actorId: user.id,
      entity: 'messages',
      entityId: view.id,
      action: 'thread_rating',
      before: null,
      after: {
        phone: view.phone_e164,
        template_key: view.template_key,
        lesson_id: view.lesson_id,
        status: view.status,
      },
    });
    return view;
  }
}
