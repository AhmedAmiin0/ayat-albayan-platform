import {
  submitBody,
  submitProblem,
  valuesOf,
  type FormValues,
  type Grade,
  type Program,
  type ReportAttachmentView,
  type ReportView,
  type Rubric,
} from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LESSONS_KEY } from '@/features/schedule/api';
import { REPORTS_KEY, submitReport } from './api';
import { useAutosave } from './use-autosave';

/** Form values; «البرنامج *» is the report's own, else the student's (the prefill). */
const entryValuesOf = (r: ReportView, student: Program): FormValues => ({
  ...valuesOf(r),
  program: r.program ?? student,
});

/**
 * One student's report on the form (R-REP-02): local values, debounced draft autosave while a
 * draft, submit (first send or «حفظ التعديل») with the same validation as the API. `studentProgram`
 * prefills «البرنامج» until the report has its own.
 */
export function useReportEntry(initial: ReportView, studentProgram: Program) {
  const queryClient = useQueryClient();
  const [report, setReport] = useState(initial);
  const [values, setValues] = useState<FormValues>(() => entryValuesOf(initial, studentProgram));
  const [problem, setProblem] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: submitReport,
    onSuccess: async (view) => {
      setReport(view);
      setValues(entryValuesOf(view, studentProgram));
      // The lesson moved (completed …), the pending list shrank, and a reopened form must load the
      // sent version (this entry keeps its own state: it is keyed by report id, seeded once).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: LESSONS_KEY }),
        queryClient.invalidateQueries({ queryKey: REPORTS_KEY }),
      ]);
    },
  });
  const saveState = useAutosave({ id: report.id, values, enabled: report.status === 'draft' && !submit.isPending });

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setProblem(null);
    setValues((v) => ({ ...v, [key]: value }));
  };
  const setGrade = (rubric: Rubric, grade: Grade) => set('grades', { ...values.grades, [rubric]: grade });
  const send = () => {
    const found = submitProblem(values, report.version);
    setProblem(found);
    if (!found) submit.mutate({ id: report.id, body: submitBody(values, report.version) });
  };
  const setAttachments = (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) =>
    setReport((r) => ({ ...r, attachments: next(r.attachments) }));

  return { report, values, set, setGrade, send, problem, submit, saveState, setAttachments };
}

export type ReportEntryState = ReturnType<typeof useReportEntry>;
