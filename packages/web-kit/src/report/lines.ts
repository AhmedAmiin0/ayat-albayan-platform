import { pageLines, type ReportLine } from '@ab/client-core';
import type { ReportPageView } from '@ab/shared';
import { t, locale } from '#/lib/i18n/index.ts';

/** A saved report's lines in the UI language (the page, and a lesson's report summary). */
export function reportLines(report: ReportPageView['report']): ReportLine[] {
  const text = { v2: t.reports.v2, grade: t.enums.grade, program: t.enums.program, lang: locale };
  return pageLines(report, { text, v1: t.reports });
}
