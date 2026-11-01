import { bookingKindOf, type BookingRequest } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import type { SalesOwnership } from '@/modules/sales/sales/sales-ownership';
import { SalesQueries } from '@/modules/sales/sales/sales.queries';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import type { BookingOwnership } from './sales-booking.scope';
import { TrialDateRepo } from '@/modules/teaching/booking/trial-date/trial-date.repo';

/**
 * The ownership /sales/booking checks (owner 2026-10-12: «if auto assign is turned off dont validate over it
 * from the sales side»): settings.sales_auto_assign ON = her leads, families and students (ownershipOf); OFF =
 * null, no ownership check, so any salesperson may register any lead (the trial-only rules still hold, and
 * brought_by still credits her). leads.assigned_to is never changed here. A failed read throws (500).
 */
@Injectable()
export class SalesBookingScope {
  constructor(
    private readonly sales: SalesQueries,
    private readonly settings: BookingSettings,
    private readonly lessons: TrialDateRepo,
  ) {}

  async of(user: AuthUser): Promise<BookingOwnership> {
    return (await this.settings.read()).sales_auto_assign ? this.sales.ownership(user.id) : null;
  }

  /**
   * A course (kind 'package', owner 2026-10-18) always reads her ownership, whatever the switch: it books the
   * subscription she sold, like her money endpoints (SalesMoneyScope, docs/16 row 17). A trial follows `of`.
   */
  forRequest(req: BookingRequest, user: AuthUser): Promise<BookingOwnership> {
    return bookingKindOf(req) === 'package' ? this.owned(user) : this.of(user);
  }

  /** Her ownership whatever the switch (a course and its wizard read). */
  owned(user: AuthUser): Promise<SalesOwnership> {
    return this.sales.ownership(user.id);
  }

  /**
   * The slot grid may leave out a lesson (excludeLessonId, «موعد تجريبي جديد»: the trial it moves) only
   * when every student of that lesson is one of the grid's students, which the caller checked are hers.
   */
  async ownLesson(lessonId: string, studentIds: readonly string[]): Promise<boolean> {
    const students = await this.lessons.lessonStudents(lessonId);
    return students.length > 0 && students.every((id) => studentIds.includes(id));
  }

  /** The grid names exactly this lesson's students (sales' «تغيير الموعد» of ANY lesson, owner 2026-10-28). */
  async isLessonOf(lessonId: string, studentIds: readonly string[]): Promise<boolean> {
    const students = await this.lessons.lessonStudents(lessonId);
    return students.length > 0 && students.length === studentIds.length && studentIds.every((id) => students.includes(id));
  }
}
