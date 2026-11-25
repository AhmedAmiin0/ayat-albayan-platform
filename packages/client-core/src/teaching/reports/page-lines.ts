import type { ReportPageReport } from '@ab/shared';
import { reportV2Lines, type ReportLine, type ReportV2Text } from './v2-lines';

/** The original form's text answers, in its words. */
export interface V1Words {
  recited: string;
  newMemorization: string;
  revision: string;
  theory: string;
}

/**
 * The report page's lines (the web page and the family app): the new form's (reportV2Lines, as
 * the admin reads it); an original form report adds its four text answers after the attendance
 * and the program.
 */
export function pageLines(
  report: ReportPageReport,
  words: { text: ReportV2Text; v1: V1Words },
): ReportLine[] {
  const lines = reportV2Lines(report, words.text);
  if (report.form_version === 2) return lines;
  const answers: ReportLine[] = [
    { key: 'recited', label: words.v1.recited, value: report.recited },
    { key: 'newMemorization', label: words.v1.newMemorization, value: report.new_memorization },
    { key: 'revision', label: words.v1.revision, value: report.revision },
    { key: 'theory', label: words.v1.theory, value: report.theory },
  ];
  return [...lines.slice(0, 2), ...answers, ...lines.slice(2)];
}
