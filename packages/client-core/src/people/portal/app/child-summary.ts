import type {
  PortalLessons,
  PortalMonth,
  PortalPackageView,
  PortalReport,
  PortalReports,
} from '@ab/shared';
import { isAhead } from '../lesson-window';
import { monthsOf } from '../history';
import { newReportCount } from '../report-seen';

// Each read may still be loading (undefined).

export interface ChildSummary {
  /** Lessons still ahead in the next 14 days. */
  upcoming: number | null;
  /** This month's attended / absent; null while unknown. */
  month: PortalMonth | null;
  /** Lessons left in the package: a guardian's or an adult's (seesMoney) only. */
  remaining: number | null;
  /** The newest sent report. */
  lastReport: PortalReport | null;
  /** Sent reports not yet opened on this device. */
  newReports: number;
}

export interface ChildSummaryInput {
  lessons: PortalLessons | undefined;
  reports: PortalReports | undefined;
  /** undefined for a viewer who never reads the package. */
  pkg: PortalPackageView | undefined;
  seen: readonly string[];
}

const aheadCount = (lessons: PortalLessons, now: Date): number =>
  lessons.lessons.filter((l) => isAhead(l, now)).length;

const lessonPart = (lessons: PortalLessons | undefined, now: Date) =>
  lessons
    ? { upcoming: aheadCount(lessons, now), month: lessons.month ?? null }
    : { upcoming: null, month: null };

const reportPart = (reports: PortalReports | undefined, seen: readonly string[]) => {
  const list = reports?.reports ?? [];
  return { lastReport: list[0] ?? null, newReports: newReportCount(list, seen) };
};

export function childSummary(input: ChildSummaryInput, now: Date): ChildSummary {
  return {
    ...lessonPart(input.lessons, now),
    remaining: input.pkg?.package?.remaining ?? null,
    ...reportPart(input.reports, input.seen),
  };
}

/** When a report counts: its lesson's start, else when it was sent. */
export const reportAt = (r: Pick<PortalReport, 'lesson_starts_at' | 'sent_at'>): string =>
  r.lesson_starts_at ?? r.sent_at;

/** Newest first, grouped by month on the family's clock. */
export const reportMonths = (
  reports: readonly PortalReport[],
  tz: string,
): { month: string; rows: PortalReport[] }[] =>
  monthsOf(reports, reportAt, tz);
