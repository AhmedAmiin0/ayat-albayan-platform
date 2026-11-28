import type { OutsideSlotsResponse } from '@ab/shared';
import type {
  BookingTeacherOption,
  OutsideSlotsQuery,
  SlotsQuery,
  SlotsResponse,
  TeacherOptionsQuery,
} from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { SlotsService } from '@/modules/teaching/booking/plan/slots.service';
import { TeacherOptionsService } from '@/modules/teaching/booking/teacher/teacher-options.service';
import { SalesBookingScope } from './sales-booking.ownership';
import { assertOwnStudents } from './sales-booking.scope';

/** An assistant's wizard reads: the admin's, naming only her students (any while not enforced). */
@Injectable()
export class SalesBookingOptions {
  constructor(
    private readonly scope: SalesBookingScope,
    private readonly teachers: TeacherOptionsService,
    private readonly slotsService: SlotsService,
  ) {}

  /** No teachers' meeting links (the room is entered via the API); platform_classroom stays. */
  async teacherOptions(q: TeacherOptionsQuery, user: AuthUser): Promise<BookingTeacherOption[]> {
    if (q.studentId) assertOwnStudents([q.studentId], await this.scope.of(user));
    return (await this.teachers.list(q)).map((t) => ({ ...t, meeting_link: null }));
  }

  /** docs/16 rows 37-38. */
  async slots(q: SlotsQuery, user: AuthUser): Promise<SlotsResponse> {
    return this.slotsService.slots({ ...q, ...(await this.scoped(q, user)) });
  }

  /** Same scope as `slots`, over the server's next 14 days. */
  async outsideSlots(q: OutsideSlotsQuery, user: AuthUser): Promise<OutsideSlotsResponse> {
    return this.slotsService.outside({ ...q, ...(await this.scoped(q, user)) });
  }

  /** Exclusions are honoured only within her scope; renew_any opens any grid; read only. */
  private async scoped(q: OutsideSlotsQuery, user: AuthUser) {
    const ids = q.studentIds ?? [];
    if (!can(user, 'sales.renew_any')) await this.assertOwnGrid(q, user);
    const keep =
      !!q.excludeLessonId && ids.length > 0 && (await this.scope.ownLesson(q.excludeLessonId, ids));
    return { excludeLessonId: keep ? q.excludeLessonId : undefined };
  }

  /** Hers while the rule enforces it (else any), or the lesson she moves; a course is hers. */
  private async assertOwnGrid(q: OutsideSlotsQuery, user: AuthUser): Promise<void> {
    const ids = q.studentIds ?? [];
    const free = !q.excludeCourse && (await this.moving(q, user));
    if (ids.length && !free) assertOwnStudents(ids, await this.scope.of(user));
  }

  private async moving(q: OutsideSlotsQuery, user: AuthUser): Promise<boolean> {
    if (!q.lessonId || !can(user, 'lessons.reschedule')) return false;
    return this.scope.isLessonOf(q.lessonId, q.studentIds ?? []);
  }
}
