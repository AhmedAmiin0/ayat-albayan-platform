import type { LessonRoomState, PortalLessons, PortalStudent } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { PortalHistoryService } from '@/modules/people/portal/history/portal-history.service';
import { PortalReportsService } from '@/modules/people/portal/reports/portal-reports.service';
import { LessonRoomStates, type RoomLesson } from '@/modules/teaching/classroom';

type LessonExtras = Required<Pick<PortalLessons, 'prepare' | 'month'>>;

/**
 * What rides on GET …/lessons beside the lessons (docs/50 §2, §6): «ما المطلوب للحلقة القادمة»
 * from the newest sent report and this month's attended / absent counts, and each lesson's live
 * room (who is inside, ended for everyone). The student is already scoped by the caller.
 */
@Injectable()
export class PortalLessonExtras {
  constructor(
    @Inject(PortalReportsService) private readonly reports: PortalReportsService,
    @Inject(PortalHistoryService) private readonly history: PortalHistoryService,
    @Inject(LessonRoomStates) private readonly live: LessonRoomStates,
  ) {}

  /** The `room` of each lesson (LessonRoomStates: only those near now are looked up). */
  rooms(lessons: readonly RoomLesson[], now: Date): Promise<Map<string, LessonRoomState | null>> {
    return this.live.of(lessons, now);
  }

  async of(student: PortalStudent, now: Date): Promise<LessonExtras> {
    const [prepare, month] = await Promise.all([
      this.reports.prepare(student.id),
      this.history.month(student, now),
    ]);
    return { prepare, month };
  }
}
