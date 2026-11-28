import { id, phoneE164 } from '@ab/core';
import { Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam } from '@/common/http/zod-inputs';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { MessageHideService } from './message-hide.service';

/**
 * Hides for staff only; the message stays on the customer's phone; only admin can show.
 * `:phone` comes last so its 400 invalid_phone wins over a bad `:messageId`.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.send')
@Controller('threads/:phone/messages/:messageId/hide')
export class MessageHideController {
  constructor(private readonly hides: MessageHideService) {}

  @Post()
  @HttpCode(204)
  async hide(
    @ZodParam('messageId', id()) messageId: string,
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.hides.hide({ phone, messageId, user });
  }

  @Delete()
  @HttpCode(204)
  async unhide(
    @ZodParam('messageId', id()) messageId: string,
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.hides.unhide({ phone, messageId, user });
  }
}
