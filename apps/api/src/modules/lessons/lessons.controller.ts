import type { LessonView } from '@ab/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { parseDay, parseWindow } from './lesson-queries.schema';
import { LessonViews } from './lesson-views';

/**
 * Admin schedule lists across teachers (docs/10 routes 1, 2): every status, by starts_at; the
 * client hides closed rows behind «إظهار الملغية…» and shows Riyadh + student time (R-SCH-01).
 */
@ApiTags('lessons')
@ApiBearerAuth()
@Roles('admin')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly views: LessonViews) {}

  /** Week view: starts_at ∈ [from, to), optional teacherId, at most 31 days. */
  @Get()
  list(@Query() query: unknown): Promise<LessonView[]> {
    return this.views.window(parseWindow(query), 'admin');
  }

  /** Day view: one local day in `tz` (default Asia/Riyadh). */
  @Get('day')
  day(@Query() query: unknown): Promise<LessonView[]> {
    return this.views.window(parseDay(query), 'admin');
  }
}
