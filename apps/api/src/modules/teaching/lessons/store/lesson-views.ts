import type { LessonView } from '@ab/shared';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Role } from '../../../../common/auth/verify-token';
import { StaffPhotos } from '../../../../common/storage/avatars/staff-photos';
import { UnpaidFlags } from '../../../finance/subscriptions/alerts/unpaid-flags.service';
import type { Page, PageQuery } from '../../../../common/http/http';
import type { LessonRow } from './lesson-row';
import { toLessonView } from '../lessons.mapper';
import { LessonsQueries, type LessonWindow } from '../lessons.queries';
import { markUnpaid, upcomingStudentIds } from '../status/unpaid-mark';

const withPhoto = (view: LessonView, photos: ReadonlyMap<string, string>): LessonView =>
  photos.size ? { ...view, teacher: { ...view.teacher, avatar_url: photos.get(view.teacher.id) ?? null } } : view;

/**
 * Loads lesson rows + their lesson numbers and maps them to LessonView for a role. Students on an
 * upcoming lesson whose package is unpaid with nothing left get `unpaid: true` (R-SUB-02). Staff
 * views carry the teacher's photo (one lookup and one signing call per response); a teacher's own
 * schedule does not (it is always her).
 */
@Injectable()
export class LessonViews {
  private readonly log = new Logger(LessonViews.name);

  constructor(
    private readonly lessons: LessonsQueries,
    private readonly unpaid: UnpaidFlags,
    private readonly photos: StaffPhotos,
  ) {}

  async map(rows: readonly LessonRow[], role: Role | null): Promise<LessonView[]> {
    const now = Date.now();
    const completed = rows.filter((r) => r.status === 'completed').map((r) => r.id);
    const [seq, flagged, academyAuto, photos] = await Promise.all([
      this.lessons.seq(completed),
      this.flagged(upcomingStudentIds(rows, now)),
      this.lessons.academyAuto(),
      role === 'teacher' ? new Map<string, string>() : this.photos.ofTeachers(rows.map((r) => r.teacher_id)),
    ]);
    return rows.map((row) => withPhoto(markUnpaid(toLessonView(row, { role, seq, academyAuto }), flagged, now), photos));
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
