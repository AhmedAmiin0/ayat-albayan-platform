import { courseLessonCount } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, notFound } from '@/common/http/errors';
import { CourseLessonRepo } from '@/modules/teaching/booking/course-change/course-change.lessons';
import { CourseChangeRepo } from '@/modules/teaching/booking/course-change/course-change.repo';
import { CourseChange } from '@/modules/teaching/booking/course-change/course-change.service';
import { actorOf } from '@/modules/teaching/booking/profile/profile-course.service';
import { ProfileCourseRepo } from '@/modules/teaching/booking/profile/profile-course.repo';
import type { CourseExtendRepo } from './course-extend.repo';
import { planExtend, type ExtendPlan } from './course-extend.plan';

/** The package «مدّ الجدول» books and its plan. */
export interface PlannedExtend {
  id: string;
  plan: ExtendPlan;
}

export interface ExtendTarget {
  studentId: string;
  /** Absent: the student's current package. */
  subscriptionId?: string | undefined;
  user: AuthUser;
}

/**
 * «مدّ الجدول»'s plan for a package of the student: 404 subscription_not_found (another
 * student's, or none), 403 not_your_student (an assistant, not hers while the ownership rule
 * holds: CourseChange.owned), 409 already_cancelled, 404 course_not_found, 409 course_paused.
 */
@Injectable()
export class CourseExtendReader {
  constructor(
    @Inject(ProfileCourseRepo) private readonly profile: ProfileCourseRepo,
    @Inject(CourseChange) private readonly course: CourseChange,
    @Inject(CourseChangeRepo) private readonly rules: CourseChangeRepo,
    @Inject(CourseLessonRepo) private readonly lessons: CourseLessonRepo,
  ) {}

  async plan(target: ExtendTarget, repo: CourseExtendRepo): Promise<PlannedExtend> {
    const { studentId } = target;
    const id = target.subscriptionId ?? (await this.profile.currentSubscription(studentId));
    const sub = await this.course.owned(id, actorOf(target.user));
    if (sub.student_id !== studentId) throw notFound('subscription_not_found');
    if ((await repo.status(id)) === 'cancelled') throw conflict('already_cancelled');
    const rules = await this.rules.rules(id);
    const lessons = await this.lessons.ofCourse({ ruleIds: rules.map((r) => r.id), studentId });
    const facts = { rules, lessonsTotal: courseLessonCount(sub), lessons, now: new Date() };
    const plan = planExtend(facts);
    if (!plan) throw notFound('course_not_found');
    if (plan.paused) throw conflict('course_paused');
    return { id, plan };
  }
}
