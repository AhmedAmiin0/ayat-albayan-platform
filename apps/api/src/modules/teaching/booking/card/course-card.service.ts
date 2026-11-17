import {
  COURSE_CARD_UPCOMING,
  courseRemaining,
  countsTowardCourse,
  type BookedCourse,
  type CourseCardView,
} from '@ab/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CourseLessonRepo } from '@/modules/teaching/booking/course-change/course-change.lessons';
import { CourseChangeRepo } from '@/modules/teaching/booking/course-change/course-change.repo';
import { CourseChangeViews } from '@/modules/teaching/booking/course-change/course-change.view';
import { ProfileCourseRepo } from '@/modules/teaching/booking/profile/profile-course.repo';

const EMPTY: CourseCardView = { subscriptionId: null, course: null, upcoming: [] };

/** A 404 (no package yet) is the empty card, never an error on the student's file. */
const orNull = (e: unknown): null => {
  if (e instanceof NotFoundException) return null;
  throw e;
};

/**
 * «الدورة والباقة» (owner 2026-11-17): the current package's course on the student's file and the
 * sales screen: its teacher, days, planned end, last booked lesson, the lessons with no date
 * («مدّ الجدول») and the next open lessons. Read only; the routes check the key.
 */
@Injectable()
export class CourseCards {
  constructor(
    @Inject(ProfileCourseRepo) private readonly profile: ProfileCourseRepo,
    @Inject(CourseChangeViews) private readonly views: CourseChangeViews,
    @Inject(CourseChangeRepo) private readonly rules: CourseChangeRepo,
    @Inject(CourseLessonRepo) private readonly lessons: CourseLessonRepo,
  ) {}

  async card(studentId: string): Promise<CourseCardView> {
    const id = await this.profile.currentSubscription(studentId).catch(orNull);
    if (id === null) return EMPTY;
    const { course } = await this.views.booked(id);
    const ruleIds = (await this.rules.rules(id)).map((r) => r.id);
    const upcoming = await this.profile.upcoming(ruleIds, COURSE_CARD_UPCOMING);
    const listed = upcoming.map((l) => ({ id: l.id, startsAt: l.starts_at, status: l.status }));
    if (!course) return { subscriptionId: id, course: null, upcoming: listed };
    const summary = await this.summary(course, studentId, ruleIds);
    return { subscriptionId: id, course: summary, upcoming: listed };
  }

  private async summary(course: BookedCourse, studentId: string, ruleIds: string[]) {
    const [teacher, lessons] = await Promise.all([
      this.profile.teacher(course.teacherId),
      this.lessons.ofCourse({ ruleIds, studentId }),
    ]);
    const counted = lessons.filter(countsTowardCourse);
    return {
      teacherName: teacher?.display_name_ar ?? null,
      days: course.days,
      tz: course.tz,
      endsOn: course.endsOn,
      lastAt: counted.map((l) => l.starts_at).sort().at(-1) ?? null,
      lessonsTotal: course.lessonsTotal,
      unbooked: Math.max(0, courseRemaining(course.lessonsTotal, lessons)),
    };
  }
}
