import {
  reportEntryValues,
  sendChecked,
  useDraftSave,
  withServerWindow,
  type SaveState,
} from '@ab/client-core';
import {
  draftBody,
  reportDraftSchema,
  submitBody,
  submitProblem,
  type FormValues,
  type ReportAttachmentView,
  type ReportView,
  type Rubric,
} from '@ab/shared';
import type { Grade, Program } from '@ab/catalog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  dropStoredDraft,
  useDraftPorts,
  useStoredDraft,
  viewWithDraft,
} from '@/teacher/report/drafts';
import { refreshAfterSubmit, saveDraft, submitReport } from '@/teacher/report/hooks/api';
import { useFormMode } from '@/teacher/report/hooks/use-form-mode';

/** The program is the report's own, else the student's prefill. */
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

/** Debounced draft save of the whole v1 form while it is a draft (R-REP-02). */
function useEntryDraft(report: ReportView, values: FormValues, sending: boolean): SaveState {
  const { id } = report;
  return useDraftSave({
    id,
    body: draftBody(values),
    enabled: report.status === 'draft' && !sending,
    save: (body) => saveDraft(id, body),
    ports: useDraftPorts(),
  }).state;
}

/** Nothing shows as sent until the API says so; offline the submit fails and says so (R-REP-02). */
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
  const saveState = useEntryDraft(report, values, submit.isPending);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setProblem(null);
    setValues((v) => ({ ...v, [key]: value }));
  };
  const setProgram = (next: Program) => set('program', next);
  const program = values.program ?? studentProgram;
  const setGrade = (rubric: Rubric, grade: Grade) =>
    set('grades', { ...values.grades, [rubric]: grade });
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
