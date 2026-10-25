import type { LessonView } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/auth/decorators';
import { pageQuerySchema, parseOrThrow, type Page } from '../../common/http/http';
import { LessonViews } from './store/lesson-views';

/** GET /students/:id/lessons — newest first with the lesson number (R-LES-03). Admin only. */
@ApiTags('students')
@ApiBearerAuth()
@Permissions('students.read')
@Controller('students/:id/lessons')
export class StudentLessonsController {
  constructor(private readonly views: LessonViews) {}

  @Get()
  list(@Param('id', ParseUUIDPipe) id: string, @Query() query: unknown): Promise<Page<LessonView>> {
    return this.views.student(id, parseOrThrow(pageQuerySchema, query));
  }
}
