import { id, phoneE164 } from '@ab/core';
import { messageHideRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { MessageHideService } from './message-hide.service';

// Each param keeps its own error (400 invalid_phone, the 400 envelope for the id), so they stay on
// ZodParam. `phone` comes last on purpose: Nest runs the later param's pipe first, so a bad phone
// still wins, as it did before.

/** Hides for staff only; the message stays on the customer's phone; only admin can show. */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.send')
@Controller()
export class MessageHideController {
  constructor(private readonly hides: MessageHideService) {}

  @Route(routes.hide)
  @HttpCode(204)
  async hide(
    @ZodParam('messageId', id()) messageId: string,
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.hides.hide({ phone, messageId, user });
  }

  @Route(routes.unhide)
  @HttpCode(204)
  async unhide(
    @ZodParam('messageId', id()) messageId: string,
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.hides.unhide({ phone, messageId, user });
  }
}
