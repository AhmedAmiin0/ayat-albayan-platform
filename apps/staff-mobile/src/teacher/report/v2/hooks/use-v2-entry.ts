import { sendChecked, useDraftSave, withServerWindow } from '@ab/client-core';
import {
  reportV2DraftSchema,
  v2DraftBody,
  v2Problem,
  v2SubmitBody,
  v2ValuesOf,
  type ReportAttachmentView,
  type ReportContent,
  type ReportFormEntry,
  type V2Values,
} from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import arBundle from '@ab/shared/i18n/ar.json';
import { t } from '@ab/mobile-kit';
import { refreshAfterSubmit } from '@/teacher/report/hooks/api';
import { useFormMode } from '@/teacher/report/hooks/use-form-mode';
import {
  dropStoredDraft,
  useDraftPorts,
  useStoredDraft,
  viewWithDraft,
} from '@/teacher/report/drafts';
import { saveDraftV2, submitReportV2 } from './api';

/** The suggestion templates, read per call (t can be overridden after boot). */
const words = () => t.reports.v2.suggest;
// A sent report stores untouched suggestions in Arabic (the bundle, or its overrides).
const storedWords = () => [arBundle.reports.v2.suggest, t.reports.v2.suggest];

/** Nothing shows as sent until the API says so (form_version 2). */
export function useV2Entry(entry: ReportFormEntry) {
  const client = useQueryClient();
  const studentProgram = entry.student.program;
  const [own, setReport] = useState(entry.report);
  // The refetched window (can_edit, sent_at, pdf_status) reaches this open card (review 11-11).
  const report = withServerWindow(own, entry.report);
  const [values, setValues] = useState<V2Values>(() =>
    v2ValuesOf(entry.report, studentProgram, storedWords()),
  );
  const [problem, setProblem] = useState<string | null>(null);
  const mode = useFormMode(report);
  const submit = useMutation({
    mutationFn: (version: number) =>
      submitReportV2(report.id, v2SubmitBody(values, { version, words: words() })),
    onSuccess: async (view) => {
      void dropStoredDraft(view.id);
      setReport(view);
      mode.sent();
      setValues(v2ValuesOf(view, studentProgram, storedWords()));
      await refreshAfterSubmit(client);
    },
  });
  const body = v2DraftBody(values);
  useStoredDraft({
    id: report.id,
    enabled: report.status === 'draft',
    schema: reportV2DraftSchema,
    body: JSON.stringify(body),
    restore: (kept) =>
      setValues(v2ValuesOf(viewWithDraft(report, kept), studentProgram, storedWords())),
  });
  const draft = useDraftSave({
    id: report.id,
    body,
    enabled: report.status === 'draft' && !submit.isPending,
    save: (next) => saveDraftV2(report.id, next),
    ports: useDraftPorts(),
  });
  const update = (patch: Partial<V2Values>) => {
    setProblem(null);
    setValues((v) => ({ ...v, ...patch }));
  };
  const edit = (change: (c: ReportContent) => ReportContent) => {
    setProblem(null);
    setValues((v) => ({ ...v, content: change(v.content) }));
  };
  // One request at a time: a second tap while pending does nothing (the guard, not the button).
  const send = () =>
    sendChecked(mode.guard, {
      check: () => v2Problem(values, { version: report.version, words: words() }),
      show: setProblem,
      request: (done) => submit.mutate(report.version, { onSettled: done }),
    });
  const setAttachments = (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) =>
    setReport((r) => ({ ...r, attachments: next(r.attachments) }));
  return {
    entry,
    report,
    values,
    locked: mode.locked,
    mode,
    update,
    edit,
    send,
    problem,
    submit,
    saveState: draft.state,
    saveDraft: draft.saveNow,
    setAttachments,
  };
}

export type V2EntryState = ReturnType<typeof useV2Entry>;
