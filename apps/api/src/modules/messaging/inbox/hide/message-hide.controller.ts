import { Controller, Delete, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { MessageHideService } from './message-hide.service';

const uuid = new ParseUUIDPipe();

/**
 * «حذف من المنصة» / «إظهار» on a WhatsApp chat bubble (owner 2026-10-30). Hides for staff only: the
 * message is still on the customer's phone. 403 for a teacher (hide) and for anyone but the admin
 * (show); 404 message_not_found for another chat's message. 204 also when nothing changed.
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
    @Param() params: Record<string, string | undefined>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.hides.hide({ ...(await target(params)), user });
  }

  @Delete()
  @HttpCode(204)
  async unhide(
    @Param() params: Record<string, string | undefined>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.hides.unhide({ ...(await target(params)), user });
  }
}

async function target(
  params: Record<string, string | undefined>,
): Promise<{ phone: string; messageId: string }> {
  const phone = phoneParam(params.phone ?? '');
  const messageId = await uuid.transform(params.messageId ?? '', {
    type: 'param',
    data: 'messageId',
  });
  return { phone, messageId };
}
