import {
  recordingVisibilitySchema,
  studentRecordingsQuerySchema,
  type StudentRecordingsPage,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../../common/http/http';
import { RecordingDeleteService } from './recording-delete.service';
import { RecordingVisibilityService } from './recording-visibility.service';
import { StudentRecordingsService } from './student-recordings.service';

/** «تسجيلات الحلقات» on the teacher-student file. The permission is the coarse gate (recordings.read for the reads, recordings.manage for show/hide and delete: admin and teacher by default); the services decide who may see which student, and DELETE stays admin-only there. */
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

  /** Newest first, paginated; admin, the teacher (own lessons or assigned student), an assigned assistant. */
  @Get('students/:id/recordings')
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentRecordingsPage> {
    return this.recordings.list({ user, studentId: id, query: parseOrThrow(studentRecordingsQuerySchema, query) });
  }

  /** Lesson ids with a finished recording, for the report history's links: no signed URLs. Same access as the list. */
  @Get('students/:id/recorded-lesson-ids')
  recordedLessonIds(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<string[]> {
    return this.recordings.recordedLessonIds({ user, studentId: id });
  }

  /** Show or hide one recording from the student (off by default); admin, or the lesson's teacher. */
  @Patch('recordings/:id/visibility')
  @Permissions('recordings.manage')
  visibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string; visible_to_student: boolean }> {
    return this.toggles.setVisibility({ user, id, visible: parseOrThrow(recordingVisibilitySchema, body).visible });
  }

  /** Admin only: removes the file, keeps the row as `deleted`, writes an audit row. */
  @Delete('recordings/:id')
  @Permissions('recordings.manage')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.deletion.remove({ user, id });
  }
}
