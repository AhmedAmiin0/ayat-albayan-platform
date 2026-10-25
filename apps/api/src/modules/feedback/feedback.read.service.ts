import type {
  FeedbackQuery,
  FeedbackRowView,
  TeacherFeedbackSummary,
  TeacherFeedbackView,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../../common/http/errors';
import type { Page, PageQuery } from '../../common/http/http';
import { TeachersQueries } from '../teachers/teachers.queries';
import { peopleOf, toRowView, toSummary, toTeacherRowView, type People } from './feedback.mapper';
import { FeedbackReadQueries, type FeedbackListRow } from './feedback.read.queries';

/** The lists behind «رأيك يهمّنا»: the admin sees everything, a teacher only their own rows (rule 9). */
@Injectable()
export class FeedbackReadService {
  constructor(
    private readonly queries: FeedbackReadQueries,
    private readonly teachers: TeachersQueries,
  ) {}

  /** GET /feedback (admin): filtered, newest request first unless sorted. */
  async list(filter: FeedbackQuery, page: PageQuery): Promise<Page<FeedbackRowView>> {
    const { rows, total } = await this.queries.page({ filter, page });
    const people = await this.people(rows);
    return { items: rows.map((r) => toRowView(r, people)), total, page: page.page, pageSize: page.pageSize };
  }

  /** GET /feedback/summary (admin): average, count and «يرشّح» share per teacher. */
  async summary(): Promise<TeacherFeedbackSummary[]> {
    const averages = await this.queries.averages();
    const people = peopleOf([], await this.queries.teachers(averages.map((a) => a.teacher_id)));
    return averages.map((a) => toSummary(a, people)).sort((a, b) => b.avg_rating - a.avg_rating || b.n - a.n);
  }

  /** GET /teachers/me/feedback: own rows (sorted/filtered like the admin's) plus the teacher's own average. The login is the scope. */
  async mine(user: AuthUser, input: { filter: FeedbackQuery; page: PageQuery }): Promise<TeacherFeedbackView> {
    const { page } = input;
    const teacherId = await this.teachers.idByProfile(user.id);
    if (!teacherId) throw notFound('teacher_not_linked');
    const [{ rows, total }, [average]] = await Promise.all([
      this.queries.mine(teacherId, input),
      this.queries.averages(teacherId),
    ]);
    const people = await this.people(rows);
    return {
      items: rows.map((r) => toTeacherRowView(r, people)),
      total,
      page: page.page,
      pageSize: page.pageSize,
      average: average ? { avg_rating: average.avg_rating, n: average.n, recommend_yes_pct: average.recommend_yes_pct } : null,
    };
  }

  private async people(rows: readonly FeedbackListRow[]): Promise<People> {
    const [students, teachers] = await Promise.all([
      this.queries.students(rows.map((r) => r.student_id)),
      this.queries.teachers(rows.map((r) => r.teacher_id)),
    ]);
    return peopleOf(students, teachers);
  }
}
