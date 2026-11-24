import { courseLessonCount } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, notFound } from '@/common/http/errors';
import { CourseLessonRepo } from '@/modules/teaching/booking/course-change/course-change.lessons';
import { CourseChangeRepo } from '@/modules/teaching/booking/course-change/course-change.repo';
import { CourseChange } from '@/modules/teaching/booking/course-change/course-change.service';
import { actorOf } from '@/modules/teaching/booking/profile/profile-course.service';
import { ProfileCourseRepo } from '@/modules/teaching/booking/profile/profile-course.repo';
import { planExtend, type ExtendPlan } from './course-extend.plan';

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

/** 404 for another student's package; 403 when not hers while the rule holds. */
@Injectable()
export class CourseExtendReader {
  constructor(
    @Inject(ProfileCourseRepo) private readonly profile: ProfileCourseRepo,
    @Inject(CourseChange) private readonly course: CourseChange,
    @Inject(CourseChangeRepo) private readonly rules: CourseChangeRepo,
    @Inject(CourseLessonRepo) private readonly lessons: CourseLessonRepo,
  ) {}

  async plan(target: ExtendTarget): Promise<PlannedExtend> {
    const { studentId } = target;
    const id = target.subscriptionId ?? (await this.profile.currentSubscription(studentId));
    const sub = await this.course.owned(id, actorOf(target.user));
    if (sub.student_id !== studentId) throw notFound('subscription_not_found');
    const rules = await this.rules.rules(id);
    const lessons = await this.lessons.ofCourse({ ruleIds: rules.map((r) => r.id), studentId });
    const facts = { rules, lessonsTotal: courseLessonCount(sub), lessons, now: new Date() };
    const plan = planExtend(facts);
    if (!plan) throw notFound('course_not_found');
    if (plan.paused) throw conflict('course_paused');
    return { id, plan };
  }
}
