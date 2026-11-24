import {
  COURSE_CARD_UPCOMING,
  courseRemaining,
  countsTowardCourse,
  type BookedCourse,
  type CourseCardView,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { CourseLessonRepo } from '@/modules/teaching/booking/course-change/course-change.lessons';
import { CourseChangeRepo } from '@/modules/teaching/booking/course-change/course-change.repo';
import { CourseChangeViews } from '@/modules/teaching/booking/course-change/course-change.view';
import { ProfileCourseRepo } from '@/modules/teaching/booking/profile/profile-course.repo';

type CardCourse = Pick<CourseCardView, 'course' | 'upcoming'>;

/** Read only. */
@Injectable()
export class CourseCardCourse {
  constructor(
    @Inject(ProfileCourseRepo) private readonly profile: ProfileCourseRepo,
    @Inject(CourseChangeViews) private readonly views: CourseChangeViews,
    @Inject(CourseChangeRepo) private readonly rules: CourseChangeRepo,
    @Inject(CourseLessonRepo) private readonly lessons: CourseLessonRepo,
  ) {}

  async read(input: { subscriptionId: string; studentId: string }): Promise<CardCourse> {
    const { course } = await this.views.booked(input.subscriptionId);
    const ruleIds = (await this.rules.rules(input.subscriptionId)).map((r) => r.id);
    const upcoming = await this.profile.upcoming(ruleIds, COURSE_CARD_UPCOMING);
    const listed = upcoming.map((l) => ({ id: l.id, startsAt: l.starts_at, status: l.status }));
    if (!course) return { course: null, upcoming: listed };
    return { course: await this.summary(course, input.studentId, ruleIds), upcoming: listed };
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
