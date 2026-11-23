import { reportEntryValues, sendChecked, withServerWindow } from '@ab/client-core';
import {
  draftBody,
  reportDraftSchema,
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
import { useState, type Dispatch, type SetStateAction } from 'react';
import { dropStoredDraft, useStoredDraft, viewWithDraft } from '@/teacher/report/drafts';
import { refreshAfterSubmit, submitReport } from '@/teacher/report/hooks/api';
import { useAutosave } from '@/teacher/report/hooks/use-autosave';
import { useFormMode } from '@/teacher/report/hooks/use-form-mode';

/** Form values; «البرنامج *» is the report's own, else the student's (the prefill; @ab/client-core). */
const entryValuesOf = reportEntryValues;

interface Restore {
  report: ReportView;
  studentProgram: Program;
  values: FormValues;
}

/** The draft this phone kept for a draft report goes back into the form on open. */
function useRestoredDraft(input: Restore, setValues: Dispatch<SetStateAction<FormValues>>): void {
  const { report, studentProgram } = input;
  useStoredDraft({
    id: report.id,
    enabled: report.status === 'draft',
    schema: reportDraftSchema,
    body: JSON.stringify(draftBody(input.values)),
    restore: (draft) => setValues(entryValuesOf(viewWithDraft(report, draft), studentProgram)),
  });
}

/**
 * One student's report on the form (R-REP-02): local values, the debounced draft autosave while a
 * draft, and the submit (first send or «حفظ التعديل») with the API's own checks first. Nothing is
 * shown as sent until the API says so: offline, the submit fails and says it was not sent.
 */
export function useReportEntry(initial: ReportView, studentProgram: Program) {
  const client = useQueryClient();
  const [own, setReport] = useState(initial);
  // The refetched window (can_edit, sent_at, pdf_status) reaches this open card (review 11-11).
  const report = withServerWindow(own, initial);
  const [values, setValues] = useState<FormValues>(() => entryValuesOf(initial, studentProgram));
  const [problem, setProblem] = useState<string | null>(null);
  const mode = useFormMode(report);
  const submit = useMutation({
    mutationFn: (version: number) => submitReport(report.id, submitBody(values, version)),
    onSuccess: async (view) => {
      void dropStoredDraft(view.id);
      setReport(view);
      mode.sent();
      setValues(entryValuesOf(view, studentProgram));
      await refreshAfterSubmit(client);
    },
  });
  useRestoredDraft({ report, studentProgram, values }, setValues);
  const saveState = useAutosave({ id: report.id, values, enabled: report.status === 'draft' && !submit.isPending });

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setProblem(null);
    setValues((v) => ({ ...v, [key]: value }));
  };
  const setProgram = (next: Program) => set('program', next);
  const program = values.program ?? studentProgram;
  const setGrade = (rubric: Rubric, grade: Grade) => set('grades', { ...values.grades, [rubric]: grade });
  const check = () => submitProblem(values, report.version);
  const request = (done: () => void) => submit.mutate(report.version, { onSettled: done });
  // One request at a time: a second tap while pending does nothing (the guard, not the button).
  const send = () => sendChecked(mode.guard, { check, show: setProblem, request });
  const setAttachments = (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) =>
    setReport((r) => ({ ...r, attachments: next(r.attachments) }));

  return {
    report,
    values,
    program,
    setProgram,
    set,
    setGrade,
    send,
    problem,
    submit,
    saveState,
    setAttachments,
    mode,
  };
}

export type ReportEntryState = ReturnType<typeof useReportEntry>;
