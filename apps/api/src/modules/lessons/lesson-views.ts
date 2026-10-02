import type { LessonView } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Role } from '../../common/auth/verify-token';
import type { Page, PageQuery } from '../teachers/http';
import type { LessonRow } from './lesson-row';
import { toLessonView } from './lessons.mapper';
import { LessonsQueries, type LessonWindow } from './lessons.queries';

/** Loads lesson rows + their lesson numbers and maps them to LessonView for a role. */
@Injectable()
export class LessonViews {
  constructor(private readonly lessons: LessonsQueries) {}

  async map(rows: readonly LessonRow[], role: Role | null): Promise<LessonView[]> {
    const completed = rows.filter((r) => r.status === 'completed').map((r) => r.id);
    const seq = await this.lessons.seq(completed);
    return rows.map((row) => toLessonView(row, { role, seq }));
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
