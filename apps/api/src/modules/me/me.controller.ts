import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { MeService } from './me.service';
import { pushTokenBody, pushTokenSchema } from './push-tokens';

/** The admin app's device registration (R-MOB-01). Always the caller's own profile, never an id. */
@ApiTags('me')
@ApiBearerAuth()
@Roles('admin')
@Controller('me/push-tokens')
export class MeController {
  constructor(private readonly me: MeService) {}

  /** Idempotent: registering a known token again changes nothing. */
  @Put()
  @HttpCode(204)
  add(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    return this.me.addPushToken(user.id, parseOrThrow(pushTokenBody, body).token);
  }

  /** The client sends the token URL-encoded (the brackets); 204 even when it was not stored. */
  @Delete(':token')
  @HttpCode(204)
  remove(@Param('token') token: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.me.removePushToken(user.id, parseOrThrow(pushTokenSchema, token));
  }
}
