import { CORRECT_TO, type LessonStatus, type LessonView } from '@ab/shared';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Role } from '@/common/auth/verify-token';
import { StaffPhotos } from '@/common/storage/avatars/staff-photos';
import { UnpaidFlags } from '@/modules/finance/subscriptions/alerts/unpaid-flags.service';
import type { Page, PageQuery } from '@/common/http/http';
import type { LessonRow } from './lesson-row';
import { toLessonView } from '@/modules/teaching/lessons/lessons.mapper';
import { LessonsRepo, type LessonWindow } from '@/modules/teaching/lessons/lessons.repo';
import { markUnpaid, upcomingStudentIds } from '@/modules/teaching/lessons/status/unpaid-mark';
import { AutoHeldRepo } from '@/modules/teaching/lessons/auto-held/auto-held.repo';

/** The statuses the job writes or a correction may land on (LessonView.auto_held). */
const SETTLED: readonly LessonStatus[] = CORRECT_TO;

const withAutoHeld = (view: LessonView, held: ReadonlySet<string>): LessonView =>
  held.has(view.id) ? { ...view, auto_held: true } : view;

const withPhoto = (view: LessonView, photos: ReadonlyMap<string, string>): LessonView =>
  photos.size ? { ...view, teacher: { ...view.teacher, avatar_url: photos.get(view.teacher.id) ?? null } } : view;

/**
 * Loads lesson rows + their lesson numbers and maps them to LessonView for a role. Students on an
 * upcoming lesson whose package is unpaid with nothing left get `unpaid: true` (R-SUB-02). Staff
 * views carry the teacher's photo (one lookup and one signing call per response); a teacher's own
 * schedule does not (it is always her).
 */
const settledIds = (rows: readonly LessonRow[]): string[] =>
  rows.filter((r) => SETTLED.includes(r.status)).map((r) => r.id);

@Injectable()
export class LessonViews {
  private readonly log = new Logger(LessonViews.name);

  constructor(
    private readonly lessons: LessonsRepo,
    private readonly unpaid: UnpaidFlags,
    private readonly photos: StaffPhotos,
    private readonly autoHeld: AutoHeldRepo,
  ) {}

  async map(rows: readonly LessonRow[], role: Role | null): Promise<LessonView[]> {
    const now = Date.now();
    const completed = rows.filter((r) => r.status === 'completed').map((r) => r.id);
    const [seq, flagged, [academyAuto, reportMinutes], photos, held] = await Promise.all([
      this.lessons.seq(completed),
      this.flagged(upcomingStudentIds(rows, now)),
      Promise.all([this.lessons.academyAuto(), this.lessons.reportMinutes()]),
      role === 'teacher' ? new Map<string, string>() : this.photos.ofTeachers(rows.map((r) => r.teacher_id)),
      role === 'teacher' ? new Set<string>() : this.correctable(settledIds(rows)),
    ]);
    const ctx = { role, seq, academyAuto, reportMinutes, now: new Date(now) };
    const view = (row: LessonRow) => markUnpaid(toLessonView(row, ctx), flagged, now);
    return rows.map((row) => withPhoto(withAutoHeld(view(row), held), photos));
  }

  /** Also a hint: the correction route checks it again. */
  private async correctable(settled: string[]): Promise<ReadonlySet<string>> {
    try {
      return await this.autoHeld.correctable(settled);
    } catch (e) {
      this.log.warn(`auto-held lookup failed: ${e instanceof Error ? e.message : String(e)}`);
      return new Set();
    }
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
