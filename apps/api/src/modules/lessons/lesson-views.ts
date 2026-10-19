import type { LessonView } from '@ab/shared';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Role } from '../../common/auth/verify-token';
import { UnpaidFlags } from '../subscriptions/unpaid-flags.service';
import type { Page, PageQuery } from '../teachers/http';
import type { LessonRow } from './lesson-row';
import { toLessonView } from './lessons.mapper';
import { LessonsQueries, type LessonWindow } from './lessons.queries';
import { markUnpaid, upcomingStudentIds } from './unpaid-mark';

/**
 * Loads lesson rows + their lesson numbers and maps them to LessonView for a role. Students on an
 * upcoming lesson whose package is unpaid with nothing left get `unpaid: true` (R-SUB-02).
 */
@Injectable()
export class LessonViews {
  private readonly log = new Logger(LessonViews.name);

  constructor(
    private readonly lessons: LessonsQueries,
    private readonly unpaid: UnpaidFlags,
  ) {}

  async map(rows: readonly LessonRow[], role: Role | null): Promise<LessonView[]> {
    const now = Date.now();
    const completed = rows.filter((r) => r.status === 'completed').map((r) => r.id);
    const [seq, flagged, academyAuto] = await Promise.all([
      this.lessons.seq(completed),
      this.flagged(upcomingStudentIds(rows, now)),
      this.lessons.academyAuto(),
    ]);
    return rows.map((row) => markUnpaid(toLessonView(row, { role, seq, academyAuto }), flagged, now));
  }

  /** The flag is a hint: a failed lookup must not take the schedule down with it. */
  private async flagged(studentIds: string[]): Promise<Set<string>> {
    try {
      return await this.unpaid.studentIds(studentIds);
    } catch (e) {
      this.log.warn(`unpaid flag lookup failed: ${e instanceof Error ? e.message : String(e)}`);
      return new Set();
    }
  }

  async one(id: string, role: Role | null): Promise<LessonView> {
    const row = await this.lessons.get(id);
    if (!row) throw new NotFoundException();
    const [view] = await this.map([row], role);
    if (!view) throw new NotFoundException();
    return view;
  }

  async many(ids: readonly string[], role: Role | null): Promise<LessonView[]> {
    return this.map(await this.lessons.byIds(ids), role);
  }

  async window(w: LessonWindow, role: Role | null): Promise<LessonView[]> {
    return this.map(await this.lessons.window(w), role);
  }

  /** GET /students/:id/lessons (route 5): 404 for an unknown student. */
  async student(studentId: string, page: PageQuery): Promise<Page<LessonView>> {
    if (!(await this.lessons.studentExists(studentId))) throw new NotFoundException();
    const rows = await this.lessons.studentPage(studentId, page);
    return { ...rows, items: await this.map(rows.items, 'admin') };
  }
}
