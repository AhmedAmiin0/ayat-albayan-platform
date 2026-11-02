import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { uuidOf } from '@/common/http/uuid-param';
import { MeetingShareGrantService, ShareGrantService } from './share-grant.service';

/** LiveKit identities the API mints: `<role>-<12 hex>` (newIdentity). */
const IDENTITY = /^[a-z]+-[0-9a-f]{12}$/;
interface Target {
  id: string;
  identity: string;
}

/** 400 for an id that is not a uuid, 404 participant_not_found for an identity we never minted. */
export function targetOf(params: Record<string, string | undefined>): Target {
  const id = uuidOf('id', params.id);
  const identity = params.identity ?? '';
  if (!IDENTITY.test(identity)) throw notFound('participant_not_found');
  return { id, identity };
}

/** {allow}: «سماح» / «إيقاف مشاركة» a guest's screen share in a lesson room. 204; 403 cannot_grant_share, 404, 503, 502. */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('classroom.moderate')
@Controller('lessons/:id/room/participants/:identity/share')
export class LessonShareController {
  constructor(private readonly shares: ShareGrantService) {}

  @Post()
  @HttpCode(204)
  async share(@Param() params: Record<string, string>, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    await this.shares.lesson({ user, body, ...targetOf(params) });
  }
}

/** The same for «اجتماع داخلي»: any staff login with a role in it (the service then requires teacher, admin or assistant). */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('meetings.write')
@Controller('meetings/:id/participants/:identity/share')
export class MeetingShareController {
  constructor(private readonly shares: MeetingShareGrantService) {}

  @Post()
  @HttpCode(204)
  async share(@Param() params: Record<string, string>, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    await this.shares.meeting({ user, body, ...targetOf(params) });
  }
}
