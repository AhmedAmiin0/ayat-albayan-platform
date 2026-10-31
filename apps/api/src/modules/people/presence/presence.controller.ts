import type { PresenceSelf, StaffPresence } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, SignedIn } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { PresenceService } from './presence.service';

/**
 * docs/33: whether this login tracks itself (any signed-in user), and the admin's staff list
 * (users.read and the base role admin). The chat headers read GET …/channel/presence instead.
 */
@ApiTags('presence')
@ApiBearerAuth()
@Controller('presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  @Get('me')
  @SignedIn()
  me(): Promise<PresenceSelf> {
    return this.presence.self();
  }

  @Get('staff')
  @Permissions('users.read')
  staff(@CurrentUser() user: AuthUser): Promise<StaffPresence> {
    return this.presence.staff(user);
  }
}
