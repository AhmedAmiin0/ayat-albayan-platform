import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../../common/http/http';
import { MeService } from './me.service';
import { pushTokenBody, pushTokenSchema } from './push-tokens';

/** The admin app's device registration (R-MOB-01). Always the caller's own profile, never an id. */
@ApiTags('me')
@ApiBearerAuth()
@Permissions('notifications.push')
@Controller('me/push-tokens')
export class MeController {
  constructor(private readonly me: MeService) {}

  /**
   * Idempotent; (re)binds the token to the caller's session, taking it off any other profile, and
   * answers the device key to send next time. 409 when it is another person's live device.
   */
  @Put()
  @HttpCode(200)
  add(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ deviceKey: string }> {
    const { token, deviceKey } = parseOrThrow(pushTokenBody, body);
    return this.me.addPushToken({ userId: user.id, token, deviceKey, sessionId: user.sessionId ?? null });
  }

  /** The client sends the token URL-encoded (the brackets); 204 even when it was not stored. */
  @Delete(':token')
  @HttpCode(204)
  remove(@Param('token') token: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.me.removePushToken(user.id, parseOrThrow(pushTokenSchema, token));
  }
}
