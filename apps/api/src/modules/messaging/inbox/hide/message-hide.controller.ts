import { Controller, Delete, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { MessageHideService } from './message-hide.service';

const uuid = new ParseUUIDPipe();

/** Hides for staff only; the message stays on the customer's phone; only admin can show. */
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
