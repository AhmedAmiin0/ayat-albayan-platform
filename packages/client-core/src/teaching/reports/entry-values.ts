import { valuesOf, type FormValues, type ReportView } from '@ab/shared';
import type { Program } from '@ab/catalog';

/** A report's form values (both apps, docs/27 E5); «البرنامج *» is the report's own, else the student's (the prefill). */
export const reportEntryValues = (report: ReportView, studentProgram: Program): FormValues => ({
  ...valuesOf(report),
  program: report.program ?? studentProgram,
});
