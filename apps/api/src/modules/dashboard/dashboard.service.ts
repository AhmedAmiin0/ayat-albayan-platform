import { LEAD_STATUSES, LESSON_STATUSES, type DateRangeQuery } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { countBy, teacherLoad } from './dashboard.mapper';
import { DashboardQueries } from './dashboard.queries';
import type { DashboardResponse, DashboardWork } from './dashboard.types';
import { FinanceService } from './finance.service';
import { rangeWindow } from './range';
import { pendingList, taskList, unpaidList } from './work.mapper';
import { WorkQueries } from './work.queries';

/** GET /dashboard/summary and /dashboard/work (R-RPT-01, R-RPT-02). */
@Injectable()
export class DashboardService {
  constructor(
    private readonly counts: DashboardQueries,
    private readonly work: WorkQueries,
    private readonly money: FinanceService,
  ) {}

  async summary(range: DateRangeQuery, now = new Date()): Promise<DashboardResponse> {
    const w = rangeWindow(range);
    const [leads, lessons, active, needs, pending, unpaid, tasks, teachers, students] = await Promise.all([
      this.counts.leads(w),
      this.counts.lessons(w),
      this.counts.activeStudents(),
      this.counts.needsConfirmation(now),
      this.work.pendingReports(now),
      this.counts.unpaidSubscriptions(),
      this.counts.openTasks(),
      this.counts.teachers(),
      this.counts.loadStudents(),
    ]);
    return {
      range,
      funnel: countBy(LEAD_STATUSES, leads.map((l) => l.status)),
      active_students: active,
      lessons_by_status: countBy(LESSON_STATUSES, lessons.map((l) => l.status)),
      needs_confirmation: needs,
      pending_reports: pendingList(pending).total,
      unpaid_subscriptions: unpaid,
      open_tasks: tasks,
      teacher_load: teacherLoad({ teachers, lessons, students }),
      finance: await this.money.finance({ range, leads }),
    };
  }

  async queue(now = new Date()): Promise<DashboardWork> {
    const [pending, unpaid, tasks] = await Promise.all([
      this.work.pendingReports(now),
      this.work.unpaid(),
      this.work.openTasks(),
    ]);
    const subjectIds = tasks.filter((t) => t.subject_type === 'subscription').map((t) => t.subject_id);
    const subjects = await this.work.taskSubjects([...new Set(subjectIds)]);
    return { pending_reports: pendingList(pending), unpaid: unpaidList(unpaid), tasks: taskList(tasks, subjects) };
  }
}
