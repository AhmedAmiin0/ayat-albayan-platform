import type { PortalLessons, PortalStudent } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { PortalHistoryService } from '@/modules/people/portal/history/portal-history.service';
import { PortalReportsService } from '@/modules/people/portal/reports/portal-reports.service';

type LessonExtras = Required<Pick<PortalLessons, 'prepare' | 'month'>>;

/**
 * What rides on GET …/lessons beside the lessons (docs/50 §2, §6): «ما المطلوب للحلقة القادمة»
 * from the newest sent report and this month's attended / absent counts. The student is already
 * scoped by the caller.
 */
@Injectable()
export class PortalLessonExtras {
  constructor(
    @Inject(PortalReportsService) private readonly reports: PortalReportsService,
    @Inject(PortalHistoryService) private readonly history: PortalHistoryService,
  ) {}

  async of(student: PortalStudent, now: Date): Promise<LessonExtras> {
    const [prepare, month] = await Promise.all([
      this.reports.prepare(student.id),
      this.history.month(student, now),
    ]);
    return { prepare, month };
  }
}
