import type { CourseCardView } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { CourseCards } from './course-card.service';

/** «الدورة والباقة» on the admin's student file (owner 2026-11-17): students.read. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('students.read')
@Controller('students/:id/course-card')
export class CourseCardController {
  constructor(private readonly cards: CourseCards) {}

  @Get()
  card(@Param('id', ParseUUIDPipe) id: string): Promise<CourseCardView> {
    return this.cards.card(id);
  }
}

/**
 * The same card on the assistant's «تفاصيل الطالب» (owner 2026-11-17): self.sales_students, ANY
 * student (owner 2026-10-30, «Make all assistants see all»), as GET /sales/students/:id.
 */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('self.sales_academy')
@Controller('sales/students/:id/course-card')
export class SalesCourseCardController {
  constructor(private readonly cards: CourseCards) {}

  @Get()
  card(@Param('id', ParseUUIDPipe) id: string): Promise<CourseCardView> {
    return this.cards.card(id);
  }
}
