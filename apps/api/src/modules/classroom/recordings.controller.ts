import type { LessonRecordingView, RecordingStatus } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { MeetingRecordingListService } from './recording-list.service';
import { RecordingStarter } from './recording.starter';

/** «التسجيلات» of an internal meeting: the admin and the creator; 1-hour links to finished files. */
@ApiTags('classroom')
@ApiBearerAuth()
@Controller('meetings/:id/recordings')
export class MeetingRecordingsController {
  constructor(private readonly recordings: MeetingRecordingListService) {}

  /** Newest first; 404 meeting_not_found, 403 anyone but an admin or the creator. */
  @Get()
  @Roles('admin', 'teacher', 'assistant', 'sales')
  list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<LessonRecordingView[]> {
    return this.recordings.list({ user, id });
  }
}

/** Whether rooms can be recorded at all, so the panels warn «التسجيل غير مفعّل على الخادم». */
@ApiTags('classroom')
@ApiBearerAuth()
@Controller('recordings/status')
export class RecordingStatusController {
  constructor(private readonly starter: RecordingStarter) {}

  @Get()
  @Roles('admin', 'teacher', 'assistant', 'sales')
  status(): RecordingStatus {
    return { configured: this.starter.configured };
  }
}
