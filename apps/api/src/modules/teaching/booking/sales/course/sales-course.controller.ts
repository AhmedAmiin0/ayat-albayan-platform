import { salesCourseRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { clientRequest } from '@/modules/teaching/booking/core/booking.payload';
import {
  CourseChange,
  type ChangeActor,
} from '@/modules/teaching/booking/course-change/course-change.service';
import { CourseDrafts } from '@/modules/teaching/booking/sales/course-draft/course-draft.service';
import { SalesCourse } from './sales-course.service';

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** Her routes also need self.sales; renew_any opens any student (docs/16 row 38). */
@ApiBearerAuth()
@Controller()
export class SalesCourseController {
  constructor(
    private readonly course: SalesCourse,
    private readonly changes: CourseChange,
    private readonly drafts: CourseDrafts,
  ) {}

  @Route(routes.view)
  view(@RouteInput() { query }: Input<'view'>, @CurrentUser() user: AuthUser) {
    assertSales(user);
    return this.course.view(query.studentId, user);
  }

  @Route(routes.check)
  @HttpCode(200)
  check(@RouteInput() { body }: Input<'check'>, @CurrentUser() user: AuthUser) {
    assertSales(user);
    return this.changes.check(body, salesActor(user));
  }

  @Route(routes.draft)
  draft(@RouteInput() { body }: Input<'draft'>, @CurrentUser() user: AuthUser) {
    assertSales(user);
    return this.drafts.save(clientRequest(body, user.role), user);
  }

  /** Codes: CourseChange.change. */
  @Route(routes.change)
  change(@RouteInput() { body }: Input<'change'>, @CurrentUser() user: AuthUser) {
    assertSales(user);
    return this.changes.change(body, salesActor(user));
  }
}

function assertSales(user: AuthUser): void {
  if (!can(user, 'self.sales')) throw forbidden('forbidden');
}

/** The assistant changes her own student's course; ANY student's with sales.renew_any. */
function salesActor(user: AuthUser): ChangeActor {
  return { user, role: 'sales', anyStudent: can(user, 'sales.renew_any') };
}
