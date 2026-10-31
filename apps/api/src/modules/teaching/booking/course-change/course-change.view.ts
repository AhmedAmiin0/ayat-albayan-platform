import { wallParts, type CourseChangeView } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { domainError } from '../booking.errors';
import { CourseChangeQueries, type ChangeRule, type CourseSub } from './course-change.queries';
import { studentCourses, type CourseRuleRow } from '../core/course-read';
import { SalesCourseQueries } from '../sales/course/sales-course.queries';

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

/** GET /booking/course/change?subscriptionId= (the admin): the course's current days, for the change dialog. */
@Injectable()
export class CourseChangeViews {
  constructor(
    private readonly change: CourseChangeQueries,
    private readonly course: SalesCourseQueries,
  ) {}

  /** 404 subscription_not_found / student_not_found / course_not_found. */
  async view(subscriptionId: string): Promise<CourseChangeView> {
    const sub = await this.change.subscription(subscriptionId);
    const [student, rows, own] = await Promise.all([
      this.course.student(sub.student_id),
      this.course.courseRules(sub.student_id),
      this.change.rules(sub.id),
    ]);
    const unlinked = own.filter((r) => r.course?.linked === false).map((r) => unlinkedRow(sub, r));
    const now = new Date();
    const courses = studentCourses([...rows, ...unlinked], now);
    const course = courses.find((c) => c.subscriptionId === sub.id);
    if (!course) throw domainError(HttpStatus.NOT_FOUND, 'course_not_found');
    const today = wallParts(now.toISOString(), course.tz).date;
    if (course.endsOn < today) throw domainError(HttpStatus.CONFLICT, 'course_finished');
    return {
      student: { id: student.id, name: student.name, code: student.code, tz: student.tz },
      course,
    };
  }
}
