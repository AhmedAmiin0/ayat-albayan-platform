import { wallParts, type CourseChangeView } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { domainError } from './booking.errors';
import { CourseChangeQueries } from './course-change.queries';
import { studentCourses } from './course-read';
import { SalesCourseQueries } from './sales-course.queries';

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
    const [student, rows] = await Promise.all([
      this.course.student(sub.student_id),
      this.course.courseRules(sub.student_id),
    ]);
    const course = studentCourses(rows).find((c) => c.subscriptionId === sub.id);
    if (!course) throw domainError(HttpStatus.NOT_FOUND, 'course_not_found');
    const today = wallParts(new Date().toISOString(), course.tz).date;
    if (course.endsOn < today) throw domainError(HttpStatus.CONFLICT, 'course_finished');
    return {
      student: { id: student.id, name: student.name, code: student.code, tz: student.tz },
      course,
    };
  }
}
