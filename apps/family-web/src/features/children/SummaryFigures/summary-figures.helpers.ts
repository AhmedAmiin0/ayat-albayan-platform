import { reportAt, type ChildSummary } from '@ab/client-core';
import { dateText } from '@ab/time';
import { t, locale } from '@ab/web-kit';

const DAY = { day: 'numeric', month: 'long' } as const;
export const LINE = 'flex flex-wrap items-center gap-x-3 gap-y-1';
export const LABEL = 'text-xs text-ink-3';

/** Formatted on the family's clock. */
export const lastLine = (summary: ChildSummary, tz: string): string => {
  const last = summary.lastReport;
  if (!last) return t.portal.app.children.noReport;
  const day = dateText(new Date(reportAt(last)), { tz, locale }, DAY);
  return t.portal.app.children.lastReport.replace('{date}', day);
};
