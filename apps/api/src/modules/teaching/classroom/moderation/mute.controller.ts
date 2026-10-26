import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { MuteLimit } from './mute-limit';
import { MeetingMuteService, MuteService } from './mute.service';
import { targetOf } from './share-grant.controller';

/**
 * {source: 'microphone' | 'camera'}: «كتم الميكروفون» / «إيقاف الكاميرا» for someone in a lesson
 * room. 204; 400, 403 cannot_mute, 404 participant_not_found, 429, 503, 502.
 */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('classroom.moderate')
@Controller('lessons/:id/room/participants/:identity/mute')
export class LessonMuteController {
  constructor(
    private readonly mutes: MuteService,
    private readonly limit: MuteLimit,
  ) {}

  @Post()
  @HttpCode(204)
  async mute(@Param() params: Record<string, string>, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    this.limit.assert(user.id);
    await this.mutes.lesson({ user, body, ...(await targetOf(params)) });
  }
}

/** The same for «اجتماع داخلي»: any staff login with a role in it (the service then applies canMute). */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('meetings.write')
@Controller('meetings/:id/participants/:identity/mute')
export class MeetingMuteController {
  constructor(
    private readonly mutes: MeetingMuteService,
    private readonly limit: MuteLimit,
  ) {}

  @Post()
  @HttpCode(204)
  async mute(@Param() params: Record<string, string>, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    this.limit.assert(user.id);
    await this.mutes.meeting({ user, body, ...(await targetOf(params)) });
  }
}
