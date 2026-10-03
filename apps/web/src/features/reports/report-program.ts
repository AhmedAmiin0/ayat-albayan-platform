import {
  draftBody,
  submitBody,
  valuesOf,
  type DraftBody,
  type FormValues,
  type Program,
  type ReportView,
  type SubmitBody,
} from '@ab/shared';

// «البرنامج *» is editable on the report form (spec) and travels with the draft and the submit.
// ponytail: stand-in until packages/shared carries `program` in FormValues / DraftBody / ReportView
// (forms/api). Once it does, delete this glue: valuesOf/draftBody/submitBody then carry it.

export type EntryValues = FormValues & { program: Program };
export type WithProgram<T> = T & { program: Program };

/** The program saved on the report, when the API sends one. */
const savedProgram = (r: ReportView): Program | null => (r as ReportView & { program?: Program | null }).program ?? null;

/** Form values; the program is the report's own, else the student's (the prefill). */
export const entryValuesOf = (r: ReportView, student: Program): EntryValues => ({
  ...valuesOf(r),
  program: savedProgram(r) ?? student,
});

export const draftWithProgram = (v: EntryValues): WithProgram<DraftBody> => ({ ...draftBody(v), program: v.program });

export const submitWithProgram = (v: EntryValues, version: number): WithProgram<SubmitBody> => ({
  ...submitBody(v, version),
  program: v.program,
});
