import {
  effective,
  v2DraftBody,
  v2Problem,
  v2SubmitBody,
  v2ValuesOf,
  type Program,
  type ReportAttachmentView,
  type ReportContent,
  type ReportV2DraftBody,
  type ReportView,
  type V2Values,
} from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { BUNDLES, t } from '@/lib/i18n/i18n';
import { REPORTS_KEY, saveDraftV2, submitReportV2 } from '@/features/reporting/reports/api';
import { useDraftSave } from '@/features/reporting/reports/entry/use-autosave';

const words = () => t.reports.v2.suggest;
// A sent report stores untouched suggestions in Arabic (the bundle, or its overrides).
const storedWords = () => [BUNDLES.ar.reports.v2.suggest, t.reports.v2.suggest];

/**
 * One student's v2 report (docs/design/report-form): local values, debounced autosave to
 * /reports/:id/v2/draft while a draft, and the send with the API's own check first (v2Problem).
 */
export function useReportEntryV2(initial: ReportView, studentProgram: Program) {
  const queryClient = useQueryClient();
  const [report, setReport] = useState(initial);
  const [values, setValues] = useState<V2Values>(() => v2ValuesOf(initial, studentProgram, storedWords()));
  const [problem, setProblem] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: submitReportV2,
    onSuccess: async (view) => {
      setReport(view);
      setValues(v2ValuesOf(view, studentProgram, storedWords()));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: LESSONS_KEY }),
        queryClient.invalidateQueries({ queryKey: REPORTS_KEY }),
      ]);
    },
  });
  const draft = useDraftSave({
    body: JSON.stringify(v2DraftBody(values)),
    enabled: report.status === 'draft' && !submit.isPending,
    save: (b) => saveDraftV2({ id: report.id, body: JSON.parse(b) as ReportV2DraftBody }),
  });

  const set = <K extends keyof V2Values>(key: K, value: V2Values[K]) => {
    setProblem(null);
    setValues((v) => ({ ...v, [key]: value }));
  };
  const setContent = (change: (c: ReportContent) => ReportContent) => {
    setProblem(null);
    setValues((v) => ({ ...v, content: change(v.content) }));
  };
  const send = () => {
    const opts = { version: report.version, words: words() };
    const found = v2Problem(values, opts);
    setProblem(found);
    if (!found) submit.mutate({ id: report.id, body: v2SubmitBody(values, opts) });
  };
  const setAttachments = (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) =>
    setReport((r) => ({ ...r, attachments: next(r.attachments) }));

  return {
    report,
    values,
    shown: effective(values, words()),
    set,
    setContent,
    send,
    problem,
    submit,
    saveState: draft.state,
    saveNow: draft.saveNow,
    setAttachments,
  };
}

export type ReportEntryV2State = ReturnType<typeof useReportEntryV2>;
