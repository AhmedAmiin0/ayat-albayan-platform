import {
  v2DraftBody,
  v2Problem,
  v2SubmitBody,
  v2ValuesOf,
  type ReportAttachmentView,
  type ReportContent,
  type ReportFormEntry,
  type ReportV2DraftBody,
  type V2Values,
} from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import arBundle from '@ab/shared/i18n/ar.json';
import { t } from '@/core/lib/i18n/i18n';
import { refreshAfterSubmit } from '../../hooks/api';
import { useDraftAutosave } from '../../hooks/use-autosave';
import { saveDraftV2, submitReportV2 } from './api';

/** The suggestion templates, read per call (t can be overridden after boot). */
const words = () => t.reports.v2.suggest;
// A sent report stores untouched suggestions in Arabic (the bundle, or its overrides).
const storedWords = () => [arBundle.reports.v2.suggest, t.reports.v2.suggest];

/**
 * One student's v2 «تقرير الحلقة» (form_version 2): local values, the debounced v2 draft save while
 * a draft («احفظ مسودة» saves at once), and the send with the API's own check first. Nothing shows
 * as sent until the API says so.
 */
export function useV2Entry(entry: ReportFormEntry) {
  const client = useQueryClient();
  const studentProgram = entry.student.program;
  const [report, setReport] = useState(entry.report);
  const [values, setValues] = useState<V2Values>(() =>
    v2ValuesOf(entry.report, studentProgram, storedWords()),
  );
  const [problem, setProblem] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: (version: number) =>
      submitReportV2(report.id, v2SubmitBody(values, { version, words: words() })),
    onSuccess: async (view) => {
      setReport(view);
      setValues(v2ValuesOf(view, studentProgram, storedWords()));
      await refreshAfterSubmit(client);
    },
  });
  const draft = useDraftAutosave({
    body: JSON.stringify(v2DraftBody(values)),
    enabled: report.status === 'draft' && !submit.isPending,
    save: (b) => saveDraftV2(report.id, JSON.parse(b) as ReportV2DraftBody),
  });
  const update = (patch: Partial<V2Values>) => {
    setProblem(null);
    setValues((v) => ({ ...v, ...patch }));
  };
  const edit = (change: (c: ReportContent) => ReportContent) => {
    setProblem(null);
    setValues((v) => ({ ...v, content: change(v.content) }));
  };
  const send = () => {
    const found = v2Problem(values, { version: report.version, words: words() });
    setProblem(found);
    if (!found) submit.mutate(report.version);
  };
  const setAttachments = (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) =>
    setReport((r) => ({ ...r, attachments: next(r.attachments) }));
  const locked = !report.can_edit;
  return {
    entry,
    report,
    values,
    locked,
    update,
    edit,
    send,
    problem,
    submit,
    saveState: draft.state,
    saveDraft: draft.flush,
    setAttachments,
  };
}

export type V2EntryState = ReturnType<typeof useV2Entry>;
