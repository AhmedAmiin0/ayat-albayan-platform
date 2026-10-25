import { threadRatingSchema, type MessageView } from '@ab/shared';
import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { phoneParam } from '../inbox/threads/phone-param';
import { parseOrThrow } from '../../common/http/http';
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
  async send(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<MessageView> {
    const { clientRequestId } = parseOrThrow(threadRatingSchema, body);
    const { view, replayed } = await this.sends.send({ phone: phoneParam(raw), actorId: user.id, clientRequestId });
    if (replayed) return view;
    await this.audit.record({
      actorId: user.id,
      entity: 'messages',
      entityId: view.id,
      action: 'thread_rating',
      before: null,
      after: { phone: view.phone_e164, template_key: view.template_key, lesson_id: view.lesson_id, status: view.status },
    });
    return view;
  }
}
