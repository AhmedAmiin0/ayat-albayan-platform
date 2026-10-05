import type { LessonRecordingView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { KickService } from './kick.service';
import { RecordingListService } from './recording-list.service';
import { ShareGrantService } from './share-grant.service';

/** LiveKit identities the API mints: `<role>-<12 hex>` (newIdentity). */
const IDENTITY = /^[a-z]+-[0-9a-f]{12}$/;

/** Classroom moderation and recordings, staff side (the services decide who, per lesson). */
@ApiTags('classroom')
@ApiBearerAuth()
@Controller('lessons/:id')
export class ModerationController {
  constructor(
    private readonly kicks: KickService,
    private readonly recordings: RecordingListService,
    private readonly shares: ShareGrantService,
  ) {}

  /** {allow}: «سماح» / «إيقاف مشاركة» a guest's screen share. 204; 403 cannot_grant_share, 404, 503, 502. */
  @Post('room/participants/:identity/share')
  @Roles('admin', 'teacher', 'assistant')
  @HttpCode(204)
  async share(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('identity') identity: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!IDENTITY.test(identity)) throw notFound('participant_not_found');
    await this.shares.lesson({ user, id, identity, body });
  }

  /**
   * «إخراج من الحلقة»: disconnects the participant and keeps their login / link out of this
   * lesson's room. 204; 404 participant_not_found, 403 cannot_remove, 503, 502 LiveKit refused.
   */
  @Post('room/participants/:identity/remove')
  @Roles('admin', 'teacher', 'assistant', 'sales')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('identity') identity: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!IDENTITY.test(identity)) throw notFound('participant_not_found');
    await this.kicks.remove({ user, lessonId: id, identity });
  }

  /** The lesson's recordings, newest first, with 1-hour links to the finished files. */
  @Get('recordings')
  @Roles('admin', 'teacher')
  recordingsOf(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<LessonRecordingView[]> {
    return this.recordings.list({ user, lessonId: id });
  }
}
