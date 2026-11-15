import { reportEntryValues, sendChecked, withServerWindow } from '@ab/client-core';
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
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { REPORTS_KEY } from '@/features/reporting/reports/api';
import { useReportApi } from '@/features/reporting/reports/report-api';
import { useAutosave } from './use-autosave';
import { useReportMode } from '@/features/reporting/reports/send/use-report-mode';

/** Form values; «البرنامج *» is the report's own, else the student's (the prefill; @ab/client-core). */
const entryValuesOf = reportEntryValues;

/**
 * One student's report on the form (R-REP-02): local values, debounced draft autosave while a
 * draft, submit (first send or «حفظ التعديل») with the same validation as the API. `studentProgram`
 * prefills «البرنامج» until the report has its own.
 */
export function useReportEntry(initial: ReportView, studentProgram: Program) {
  const queryClient = useQueryClient();
  const api = useReportApi();
  const [own, setReport] = useState(initial);
  // The refetched window (can_edit, sent_at, pdf_status) reaches this open card (review 11-11).
  const report = withServerWindow(own, initial);
  const [values, setValues] = useState<FormValues>(() => entryValuesOf(initial, studentProgram));
  const [problem, setProblem] = useState<string | null>(null);
  // A closed card shows what was saved (the newest copy), never unsaved edits (review 11-11).
  const saved = initial.version >= own.version ? initial : own;
  const shown = report.can_edit ? values : entryValuesOf(saved, studentProgram);
  const mode = useReportMode(report);
  const submit = useMutation({
    mutationFn: api.submitReport,
    onSuccess: async (view) => {
      setReport(view);
      mode.sent();
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
  // One request at a time: a second tap or Enter while pending does nothing (the guard).
  const send = () =>
    sendChecked(mode.guard, {
      check: () => submitProblem(values, report.version),
      show: setProblem,
      request: (done) => {
        const body = submitBody(values, report.version);
        submit.mutate({ id: report.id, body }, { onSettled: done });
      },
    });
  const setAttachments = (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) =>
    setReport((r) => ({ ...r, attachments: next(r.attachments) }));

  return {
    report, values: shown, set, setGrade, send, problem, submit, saveState, setAttachments, mode,
  };
}

export type ReportEntryState = ReturnType<typeof useReportEntry>;
