import {
  changeEffectiveFrom,
  type CourseChangeCheck,
  type CourseChangeResult,
  type ProfileCourseView,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { CourseChangeRepo } from '@/modules/teaching/booking/course-change/course-change.repo';
import {
  CourseChange,
  type ChangeActor,
  type CourseMove,
} from '@/modules/teaching/booking/course-change/course-change.service';
import { CourseChangeViews } from '@/modules/teaching/booking/course-change/course-change.view';
import { ProfileCourseRepo } from './profile-course.repo';

interface Move {
  studentId: string;
  body: CourseMove;
  user: AuthUser;
}

/**
 * «تغيير المعلم» and «تغيير موعد الحلقات» from the student's profile (owner 2026-10-30): the same
 * CourseChange as the lesson drawer's «تغيير أيام الحلقات» (the remaining count kept, the conflict
 * check, one transaction, audited), for ANY student, by whoever holds the route's key. The admin
 * may override a clash with a reason; every other holder never (403 override_not_allowed). A
 * teacher change also moves students.teacher_id (the family channel follows it). Past lessons,
 * reports and earnings are never touched; the calendar sync hears every moved and new lesson
 * through the lessons' outbox triggers (docs/24).
 */
@Injectable()
export class ProfileCourse {
  constructor(
    private readonly course: CourseChange,
    private readonly views: CourseChangeViews,
    private readonly queries: CourseChangeRepo,
    private readonly repo: ProfileCourseRepo,
  ) {}

  /** The course to change, with its current teacher and «من تاريخ»'s default (the next lesson). */
  async view(studentId: string, picked?: string): Promise<ProfileCourseView> {
    const subscriptionId = picked ?? (await this.repo.currentSubscription(studentId));
    await this.ownedBy(studentId, subscriptionId);
    const view = await this.views.view(subscriptionId);
    const course = await this.queries.course(subscriptionId);
    const upcoming = await this.repo.upcoming(course.map((r) => r.rule_id));
    return {
      ...view,
      nextLesson: changeEffectiveFrom(upcoming, { tz: view.course.tz, now: new Date() }),
    };
  }

  check(move: Move): Promise<CourseChangeCheck> {
    return this.guarded(move, (actor) => this.course.check(move.body, actor));
  }

  /**
   * 201; a retry with the same clientRequestId returns the first change and re-assigns nothing new.
   */
  async change(move: Move & { body: { clientRequestId: string } }): Promise<CourseChangeResult> {
    const from = await this.repo.studentTeacher(move.studentId);
    const result = await this.guarded(move, (actor) => this.course.change(move.body, actor));
    const to = move.body.teacherId;
    if (to !== undefined && to !== from) {
      const { subscriptionId } = move.body;
      await this.repo.assignTeacher({
        studentId: move.studentId,
        from,
        to,
        actorId: move.user.id,
        subscriptionId,
      });
    }
    return result;
  }

  private async guarded<T>(move: Move, run: (actor: ChangeActor) => Promise<T>): Promise<T> {
    await this.ownedBy(move.studentId, move.body.subscriptionId);
    if (move.body.teacherId !== undefined) await this.assertTeacher(move.body);
    const role = move.user.role === 'admin' ? 'admin' : 'sales';
    return run({ user: move.user, role, anyStudent: true });
  }

  /** 404 subscription_not_found unless the package is this student's. */
  private async ownedBy(studentId: string, subscriptionId: string): Promise<void> {
    const sub = await this.queries.subscription(subscriptionId);
    if (sub.student_id !== studentId) throw notFound('subscription_not_found');
  }

  /**
   * 404 teacher_not_found, 409 teacher_inactive, 400 same_teacher (the course's teacher already).
   */
  private async assertTeacher(body: CourseMove): Promise<void> {
    const teacher = body.teacherId ? await this.repo.teacher(body.teacherId) : null;
    if (!teacher) throw notFound('teacher_not_found');
    if (teacher.status !== 'active') throw conflict('teacher_inactive');
    const rules = await this.queries.rules(body.subscriptionId);
    const current = rules.find((r) => r.status === 'active')?.teacher_id;
    if (current === teacher.id) throw badRequest('same_teacher');
  }
}
