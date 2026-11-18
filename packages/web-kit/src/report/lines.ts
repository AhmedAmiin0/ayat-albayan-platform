import { pageLines, type ReportLine } from '@ab/client-core';
import type { ReportPageView } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

/** A saved report's lines in the UI language (the page, and a lesson's report summary). */
export function reportLines(report: ReportPageView['report']): ReportLine[] {
  const text = { v2: t.reports.v2, grade: t.enums.grade, program: t.enums.program, lang: locale };
  return pageLines(report, { text, v1: t.reports });
}
