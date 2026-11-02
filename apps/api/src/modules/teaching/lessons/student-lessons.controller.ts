import type { LessonView } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Permissions } from '@/common/auth/decorators';
import { pageQuerySchema, type Page } from '@/common/http/http';
import { ZodQuery } from '@/common/http/zod-inputs';
import { LessonViews } from './store/lesson-views';

/** GET /students/:id/lessons — newest first with the lesson number (R-LES-03). Admin only. */
@ApiTags('students')
@ApiBearerAuth()
@Permissions('students.read')
@Controller('students/:id/lessons')
export class StudentLessonsController {
  constructor(private readonly views: LessonViews) {}

  @Get()
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodQuery(pageQuerySchema) page: z.output<typeof pageQuerySchema>,
  ): Promise<Page<LessonView>> {
    return this.views.student(id, page);
  }
}
