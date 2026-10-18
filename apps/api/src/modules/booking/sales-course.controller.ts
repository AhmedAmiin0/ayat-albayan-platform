import { courseChangeCheckSchema, courseChangeSchema, type CourseChangeCheck, type CourseChangeResult, type SalesCourseView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import { can } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { forbidden } from '../scheduling/errors';
import { parseOrThrow } from '../teachers/http';
import { courseQuerySchema } from './booking.dto';
import { CourseChange } from './course-change.service';
import { SalesCourse } from './sales-course.service';

/**
 * The assistant's course wizard (owner 2026-10-18, R-ASST-01): what to book for the subscription she sold.
 * Needs both self.sales_money (the route's) and self.sales (the booking wizard's; 403 otherwise), and the
 * student must be hers whatever settings.sales_auto_assign says. The booking itself is POST /sales/booking
 * with kind 'package'. «تغيير أيام الحلقات» (POST course/change[/check]) changes her own student's course,
 * never over a clash (CourseChange).
 */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('self.sales_money')
@Controller('sales/booking')
export class SalesCourseController {
  constructor(
    private readonly course: SalesCourse,
    private readonly changes: CourseChange,
  ) {}

  /** 200 SalesCourseView; 403 not_your_student; 404 student_not_found. */
  @Get('course')
  view(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<SalesCourseView> {
    if (!can(user, 'self.sales')) throw forbidden('forbidden');
    return this.course.view(parseOrThrow(courseQuerySchema, query).studentId, user);
  }

  /** 200 { conflicts, remaining, endsOn }, nothing written; 403 not_your_student / override_not_allowed. */
  @Post('course/change/check')
  @HttpCode(200)
  check(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CourseChangeCheck> {
    if (!can(user, 'self.sales')) throw forbidden('forbidden');
    return this.changes.check(parseOrThrow(courseChangeCheckSchema, body), { user, role: 'sales' });
  }

  /** 201 CourseChangeResult; codes: CourseChange.change (a clash is always 409 conflict). */
  @Post('course/change')
  change(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CourseChangeResult> {
    if (!can(user, 'self.sales')) throw forbidden('forbidden');
    return this.changes.change(parseOrThrow(courseChangeSchema, body), { user, role: 'sales' });
  }
}
