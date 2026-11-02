import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { SalesOwnershipRule } from '@/modules/sales/sales';
import type { BookingOwnership } from './sales-booking.scope';
import { TrialDateRepo } from '@/modules/teaching/booking/trial-date/trial-date.repo';

/**
 * The ownership /sales/booking checks: THE rule (SalesOwnershipRule, owner 2026-11-02): her leads,
 * families and students (ownershipOf) only while sales_require_assignee AND sales_auto_assign are ON;
 * otherwise null, no ownership check, so any salesperson may book any lead, family or student, trial or
 * course (the trial-only rules still hold, and brought_by still credits her). leads.assigned_to is never
 * changed here. A failed read throws (500).
 */
@Injectable()
export class SalesBookingScope {
  constructor(
    private readonly rule: SalesOwnershipRule,
    private readonly lessons: TrialDateRepo,
  ) {}

  /** Her ownership while the rule enforces it; null = any lead, family or student. */
  of(user: AuthUser): Promise<BookingOwnership> {
    return this.rule.scope(user);
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
