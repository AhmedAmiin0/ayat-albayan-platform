import { valuesOf, type FormValues, type ReportView } from '@ab/shared';
import type { Program } from '@ab/catalog';

/** The program is the report's own, else the student's (docs/27 E5). */
export const reportEntryValues = (report: ReportView, studentProgram: Program): FormValues => ({
  ...valuesOf(report),
  program: report.program ?? studentProgram,
});
