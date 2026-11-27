import {
  PORTAL_HISTORY_PAGE,
  portalHistorySchema,
  type PortalHistory,
  type PortalHistoryQuery,
  type PortalHistoryRow,
  type PortalMonth,
  type PortalStudent,
} from '@ab/shared';
import { zonedPartsIn } from '@ab/time';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { PortalReportsRepo } from '@/modules/people/portal/reports/portal-reports.repo';
import { recordingByLesson } from '@/modules/people/portal/reports/portal-reports.mapper';
import { PortalScopes } from '@/modules/people/portal/scope/portal-scope';
import { attendanceWindow } from '@/modules/sales/sales-students';
import { collectPage } from './portal-history.page';
import { monthCounts, pickFor, toHistoryRow, type PastLesson } from './portal-history.mapper';
import { PortalHistoryRepo } from './portal-history.repo';

/** Lessons read per batch, and batches per request (most students fill a page in one). */
const SIZE = { page: PORTAL_HISTORY_PAGE, batch: 60, maxBatches: 5 };

interface HistoryCall {
  user: AuthUser;
  studentId: string;
  query: PortalHistoryQuery;
}

/** docs/50 §5: newest first, keyset by starts_at, with sent report and visible recording. */
@Injectable()
export class PortalHistoryService {
  constructor(
    @Inject(PortalScopes) private readonly scopes: PortalScopes,
    @Inject(PortalHistoryRepo) private readonly lessons: PortalHistoryRepo,
    @Inject(PortalReportsRepo) private readonly reports: PortalReportsRepo,
  ) {}

  async history(call: HistoryCall, now = new Date()): Promise<PortalHistory> {
    const { studentId } = call;
    await this.scopes.student(call.user, studentId);
    const source = {
      read: (before: string) => this.lessons.before({ studentId, before, limit: SIZE.batch }),
      pick: pickFor(call.query.status),
    };
    const page = await collectPage(source, call.query.cursor ?? now.toISOString(), SIZE);
    const rows = await this.rowsOf(studentId, page.rows);
    return asResponse(portalHistorySchema, { rows, next_cursor: page.next_cursor });
  }

  /** This calendar month in the student's clock, up to now. */
  async month(student: PortalStudent, now: Date): Promise<PortalMonth> {
    const month = zonedPartsIn(now, student.tz).date.slice(0, 7);
    const window = attendanceWindow(month, now, student.tz);
    return monthCounts(await this.lessons.between({ studentId: student.id, ...window }));
  }

  private async rowsOf(studentId: string, rows: PastLesson[]): Promise<PortalHistoryRow[]> {
    const lessonIds = rows.map((r) => r.id);
    const [sent, recordings] = await Promise.all([
      this.reports.sentOf({ studentId, lessonIds }),
      this.reports.visibleRecordings(lessonIds),
    ]);
    const refs = {
      reports: new Map(sent.map((r) => [r.lesson_id, r.id])),
      recordings: recordingByLesson(recordings),
    };
    return rows.map((r) => toHistoryRow(r, refs));
  }
}
