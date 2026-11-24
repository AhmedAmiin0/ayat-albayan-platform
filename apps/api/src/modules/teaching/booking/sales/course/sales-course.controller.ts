import { courseChangeCheckSchema, courseChangeSchema, type CourseChangeCheck, type CourseChangeResult, type SalesCourseView } from '@ab/shared';
import type { BookingRequest, CourseDraftSaved } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ZodBody } from '@/common/http/zod-inputs';
import { clientRequest } from '@/modules/teaching/booking/core/booking.payload';
import { bookingBodySchema } from '@/modules/teaching/booking/plan/package-size';
import { CourseDrafts } from '@/modules/teaching/booking/sales/course-draft/course-draft.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { parseOrThrow } from '@/common/http/http';
import { courseQuerySchema } from '@/modules/teaching/booking/booking.dto';
import { CourseChange, type ChangeActor } from '@/modules/teaching/booking/course-change/course-change.service';
import { SalesCourse } from './sales-course.service';

/** R-ASST-01: needs self.sales_money and self.sales; renew_any opens any (docs/16 row 38). */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('self.sales_money')
@Controller('sales/booking')
export class SalesCourseController {
  constructor(
    private readonly course: SalesCourse,
    private readonly changes: CourseChange,
    private readonly drafts: CourseDrafts,
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
    return this.changes.check(parseOrThrow(courseChangeCheckSchema, body), salesActor(user));
  }

  /** Unpaid with an open link keeps the picks until payment, else books at once. */
  @Put('course/draft')
  draft(
    @ZodBody(bookingBodySchema) req: BookingRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseDraftSaved> {
    if (!can(user, 'self.sales')) throw forbidden('forbidden');
    return this.drafts.save(clientRequest(req, user.role), user);
  }

  /** 201 CourseChangeResult; codes: CourseChange.change (a clash is always 409 conflict). */
  @Post('course/change')
  change(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CourseChangeResult> {
    if (!can(user, 'self.sales')) throw forbidden('forbidden');
    return this.changes.change(parseOrThrow(courseChangeSchema, body), salesActor(user));
  }
}

/** The assistant changes her own student's course; ANY student's with sales.renew_any. */
function salesActor(user: AuthUser): ChangeActor {
  return { user, role: 'sales', anyStudent: can(user, 'sales.renew_any') };
}
