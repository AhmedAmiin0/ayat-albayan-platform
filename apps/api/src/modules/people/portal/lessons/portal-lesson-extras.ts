import type { PortalLessons, PortalStudent } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { PortalHistoryService } from '@/modules/people/portal/history/portal-history.service';
import { PortalReportsService } from '@/modules/people/portal/reports/portal-reports.service';
import { familyNamed, LessonRoomStates, type RoomLesson, type RoomStates } from '@/modules/teaching/lessons';

/** The read's time and the login's students (whom the family may know by name). */
interface FamilyNow {
  now: Date;
  family: readonly string[];
}

type LessonExtras = Required<Pick<PortalLessons, 'prepare' | 'month'>>;

/** docs/50 §2, §6: the student is already scoped by the caller. */
@Injectable()
export class PortalLessonExtras {
  constructor(
    @Inject(PortalReportsService) private readonly reports: PortalReportsService,
    @Inject(PortalHistoryService) private readonly history: PortalHistoryService,
    @Inject(LessonRoomStates) private readonly live: LessonRoomStates,
  ) {}

  /**
   * The `room` of each lesson (LessonRoomStates: only those near now are looked up), naming only
   * the teacher and this family's students: others by role.
   */
  rooms(lessons: readonly RoomLesson[], at: FamilyNow): Promise<RoomStates> {
    return this.live.of(lessons, at.now, familyNamed(at.family));
  }

  async of(student: PortalStudent, now: Date): Promise<LessonExtras> {
    const [prepare, month] = await Promise.all([
      this.reports.prepare(student.id),
      this.history.month(student, now),
    ]);
    return { prepare, month };
  }
}
