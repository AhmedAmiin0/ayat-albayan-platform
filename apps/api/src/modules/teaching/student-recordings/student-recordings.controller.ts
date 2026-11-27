import { studentRecordingsRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { RecordingDeleteService } from './retention/recording-delete.service';
import { RecordingVisibilityService } from './recording-visibility.service';
import { StudentRecordingsService } from './student-recordings.service';

/** Permissions are the coarse gate; services decide per student, and DELETE stays admin-only. */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('recordings.read')
@Controller()
export class StudentRecordingsController {
  constructor(
    private readonly recordings: StudentRecordingsService,
    private readonly toggles: RecordingVisibilityService,
    private readonly deletion: RecordingDeleteService,
  ) {}

  /** Newest first; admin, the teacher (own lessons or assigned student), an assigned assistant. */
  @Route(routes.list)
  list(
    @RouteInput() { params, query }: RouteInputOf<typeof routes.list>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recordings.list({ user, studentId: params.id, query });
  }

  /** Same access as the list. */
  @Route(routes.recordedLessonIds)
  recordedLessonIds(
    @RouteInput() { params }: RouteInputOf<typeof routes.recordedLessonIds>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recordings.recordedLessonIds({ user, studentId: params.id });
  }

  /** Off by default; admin, or the lesson's teacher. */
  @Route(routes.visibility)
  @Permissions('recordings.manage')
  visibility(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.visibility>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.toggles.setVisibility({ user, id: params.id, visible: body.visible });
  }

  /** Admin only: removes the file, keeps the row as `deleted`, writes an audit row. */
  @Route(routes.remove)
  @Permissions('recordings.manage')
  @HttpCode(204)
  async remove(
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.deletion.remove({ user, id: params.id });
  }
}
