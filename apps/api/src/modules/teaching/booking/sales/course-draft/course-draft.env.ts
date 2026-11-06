import { Injectable } from '@nestjs/common';
import { CourseDue } from '@/modules/finance/subscriptions';
import { BookingService } from '@/modules/teaching/booking/core/booking.service';
import { SalesBookingService } from '@/modules/teaching/booking/sales/booking/sales-booking.service';
import { SalesCourse } from '@/modules/teaching/booking/sales/course/sales-course.service';

/** What CourseDrafts books with and whom it tells (rule 2: at most 4 constructor parameters). */
@Injectable()
export class CourseDraftEnv {
  constructor(
    readonly sales: SalesBookingService,
    readonly course: SalesCourse,
    readonly booking: BookingService,
    readonly due: CourseDue,
  ) {}
}
