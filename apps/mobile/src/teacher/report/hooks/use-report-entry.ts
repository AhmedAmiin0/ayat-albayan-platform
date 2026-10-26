import { reportEntryValues } from '@ab/client-core';
import {
  submitBody,
  submitProblem,
  type FormValues,
  type Grade,
  type Program,
  type ReportAttachmentView,
  type ReportView,
  type Rubric,
} from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { pathKey } from '@/core/lib/query/query-keys';
import { submitReport } from './api';
import { useAutosave } from './use-autosave';

/** Form values; «البرنامج *» is the report's own, else the student's (the prefill; @ab/client-core). */
const entryValuesOf = reportEntryValues;

/**
 * One student's report on the form (R-REP-02): local values, the debounced draft autosave while a
 * draft, and the submit (first send or «حفظ التعديل») with the API's own checks first. Nothing is
 * shown as sent until the API says so: offline, the submit fails and says it was not sent.
 */
export function useReportEntry(initial: ReportView, studentProgram: Program) {
  const client = useQueryClient();
  const [report, setReport] = useState(initial);
  const [values, setValues] = useState<FormValues>(() => entryValuesOf(initial, studentProgram));
  const [problem, setProblem] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: (version: number) => submitReport(report.id, submitBody(values, version)),
    onSuccess: async (view) => {
      setReport(view);
      setValues(entryValuesOf(view, studentProgram));
      // The lesson moved (completed …), the pending list shrank, history has a new row.
      await Promise.all([
        client.invalidateQueries({ queryKey: pathKey('/lessons') }),
        client.invalidateQueries({ queryKey: pathKey('/reports') }),
        client.invalidateQueries({ queryKey: pathKey('/teachers/me/reports') }),
      ]);
    },
  });
  const saveState = useAutosave({ id: report.id, values, enabled: report.status === 'draft' && !submit.isPending });

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setProblem(null);
    setValues((v) => ({ ...v, [key]: value }));
  };
  const setProgram = (next: Program) => set('program', next);
  const program = values.program ?? studentProgram;
  const setGrade = (rubric: Rubric, grade: Grade) => set('grades', { ...values.grades, [rubric]: grade });
  const send = () => {
    const found = submitProblem(values, report.version);
    setProblem(found);
    if (!found) submit.mutate(report.version);
  };
  const setAttachments = (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) =>
    setReport((r) => ({ ...r, attachments: next(r.attachments) }));

  return { report, values, program, setProgram, set, setGrade, send, problem, submit, saveState, setAttachments };
}

export type ReportEntryState = ReturnType<typeof useReportEntry>;
