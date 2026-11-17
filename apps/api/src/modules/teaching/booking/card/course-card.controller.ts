import type { CourseCardView } from '@ab/shared';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Permissions } from '@/common/auth/decorators';
import { ZodParam } from '@/common/http/zod-inputs';
import { CourseCards } from './course-card.service';

/** «الدورة والباقة» on the admin's student file (owner 2026-11-17): students.read. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('students.read')
@Controller('students/:id/course-card')
export class CourseCardController {
  constructor(@Inject(CourseCards) private readonly cards: CourseCards) {}

  @Get()
  card(@ZodParam('id', z.uuid()) id: string): Promise<CourseCardView> {
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
  constructor(@Inject(CourseCards) private readonly cards: CourseCards) {}

  @Get()
  card(@ZodParam('id', z.uuid()) id: string): Promise<CourseCardView> {
    return this.cards.card(id);
  }
}
