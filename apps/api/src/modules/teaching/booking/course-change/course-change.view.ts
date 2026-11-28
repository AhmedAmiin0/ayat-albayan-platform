import { courseChangeViewSchema, type BookedCourse, type CourseChangeView } from '@ab/shared';
import { wallParts } from '@ab/schedule';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CourseChangeRepo, type ChangeRule, type CourseSub } from './course-change.repo';
import { studentCourses, type CourseRuleRow } from '@/modules/teaching/booking/core/course-read';
import { SalesCourseRepo } from '@/modules/teaching/booking/sales/course/sales-course.repo';
import { httpError } from '@/common/http/errors';
import { asResponse } from '@/common/http/returns';

/** An open-ended rule without subscription_id (an import) still runs: it has no last day yet. */
const OPEN_END = '9999-12-31';

/** A course rule without subscription_id (course_rules_of, migration 991) as a course row. */
const unlinkedRow = (sub: CourseSub, r: ChangeRule): CourseRuleRow => ({
  ...r,
  subscription_id: sub.id,
  ends_on: r.ends_on ?? OPEN_END,
  sub: {
    package: sub.package,
    lessons_total: sub.lessons_total,
    lessons_used_before: sub.lessons_used_before,
  },
  teacher: null,
});

/** A package's student and its course (null = none booked). */
interface Booked {
  student: CourseChangeView['student'];
  course: BookedCourse | null;
}

/**
 * GET /booking/course/change?subscriptionId= (the admin): the course's current days, for the change
 * dialog.
 */
@Injectable()
export class CourseChangeViews {
  constructor(
    private readonly change: CourseChangeRepo,
    private readonly course: SalesCourseRepo,
  ) {}

  /** 404 subscription_not_found / student_not_found / course_not_found. */
  async view(subscriptionId: string): Promise<CourseChangeView> {
    const { student, course } = await this.booked(subscriptionId);
    if (!course) throw httpError(HttpStatus.NOT_FOUND, 'course_not_found');
    const today = wallParts(new Date().toISOString(), course.tz).date;
    if (course.endsOn < today) throw httpError(HttpStatus.CONFLICT, 'course_finished');
    return asResponse(courseChangeViewSchema, { student, course });
  }

  /** The package's student and its course, also one already finished; null = none booked. */
  async booked(subscriptionId: string): Promise<Booked> {
    const sub = await this.change.subscription(subscriptionId);
    const [student, rows, own] = await Promise.all([
      this.course.student(sub.student_id),
      this.course.courseRules(sub.student_id),
      this.change.rules(sub.id),
    ]);
    const unlinked = own.filter((r) => r.course?.linked === false).map((r) => unlinkedRow(sub, r));
    const courses = studentCourses([...rows, ...unlinked], new Date());
    const course = courses.find((c) => c.subscriptionId === sub.id) ?? null;
    return {
      student: { id: student.id, name: student.name, code: student.code, tz: student.tz },
      course,
    };
  }
}
