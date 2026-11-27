import { courseCardRoutes as routes } from '@ab/shared';
import { Controller, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CourseCards } from './course-card.service';

@ApiBearerAuth()
@Controller()
export class CourseCardController {
  constructor(@Inject(CourseCards) private readonly cards: CourseCards) {}

  @Route(routes.card)
  card(@RouteInput() { params }: RouteInputOf<typeof routes.card>) {
    return this.cards.card(params.id);
  }
}

/** self.sales_academy, any student, as GET /sales/students/:id. */
@ApiBearerAuth()
@Controller()
export class SalesCourseCardController {
  constructor(@Inject(CourseCards) private readonly cards: CourseCards) {}

  @Route(routes.salesCard)
  card(@RouteInput() { params }: RouteInputOf<typeof routes.salesCard>) {
    return this.cards.card(params.id);
  }
}
