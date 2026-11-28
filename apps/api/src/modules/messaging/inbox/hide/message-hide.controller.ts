import { messageHideRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { MessageHideService } from './message-hide.service';

// A bad phone (400 invalid_phone) wins over a bad id (the 400 envelope).
const phoneThenId = { paramErrors: [{ name: 'phone', fail: invalidPhone }, { name: 'messageId' }] };

/** Hides for staff only; the message stays on the customer's phone; only admin can show. */
@ApiBearerAuth()
@Controller()
export class MessageHideController {
  constructor(private readonly hides: MessageHideService) {}

  @Route(routes.hide)
  @HttpCode(204)
  async hide(
    @RouteInput(phoneThenId) { params }: RouteInputOf<typeof routes.hide>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.hides.hide({ ...params, user });
  }

  @Route(routes.unhide)
  @HttpCode(204)
  async unhide(
    @RouteInput(phoneThenId) { params }: RouteInputOf<typeof routes.unhide>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.hides.unhide({ ...params, user });
  }
}
