import {
  recordingVisibilitySchema,
  studentRecordingsQuerySchema,
  type StudentRecordingsPage,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { RecordingDeleteService } from './recording-delete.service';
import { RecordingVisibilityService } from './recording-visibility.service';
import { StudentRecordingsService } from './student-recordings.service';

/** «تسجيلات الحلقات» on the teacher-student file. Guards are the services' (the @Roles are the coarse gate). */
@ApiTags('classroom')
@ApiBearerAuth()
@Controller()
export class StudentRecordingsController {
  constructor(
    private readonly recordings: StudentRecordingsService,
    private readonly toggles: RecordingVisibilityService,
    private readonly deletion: RecordingDeleteService,
  ) {}

  /** Newest first, paginated; admin, the teacher (own lessons or assigned student), an assigned assistant. */
  @Get('students/:id/recordings')
  @Roles('admin', 'teacher', 'assistant')
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentRecordingsPage> {
    return this.recordings.list({ user, studentId: id, query: parseOrThrow(studentRecordingsQuerySchema, query) });
  }

  /** Show or hide one recording from the student (off by default); admin, or the lesson's teacher. */
  @Patch('recordings/:id/visibility')
  @Roles('admin', 'teacher')
  visibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string; visible_to_student: boolean }> {
    return this.toggles.setVisibility({ user, id, visible: parseOrThrow(recordingVisibilitySchema, body).visible });
  }

  /** Admin only: removes the file, keeps the row as `deleted`, writes an audit row. */
  @Delete('recordings/:id')
  @HttpCode(204)
  @Roles('admin')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.deletion.remove({ user, id });
  }
}
