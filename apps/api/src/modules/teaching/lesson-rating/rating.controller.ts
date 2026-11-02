import { phoneE164, threadRatingSchema, type MessageView } from '@ab/shared';
import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { RatingSendService } from './rating.send.service';

/**
 * «إرسال تقييم الحلقة» from the inbox (admin): 201 the queued / sent lesson_rating row; 404
 * not_a_guardian / no_completed_lesson; 409 template_not_approved. Audited like H4.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('feedback.write')
@Controller('threads')
export class RatingController {
  constructor(
    private readonly sends: RatingSendService,
    private readonly audit: AuditService,
  ) {}

  @Post(':phone/rating')
  @HttpCode(201)
  async send(
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @ZodBody(threadRatingSchema) body: z.output<typeof threadRatingSchema>,
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
