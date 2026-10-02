import type { Grade, ReportAttachmentView, ReportView, Rubric } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LESSONS_KEY } from '@/features/schedule/api';
import { REPORTS_KEY, submitReport } from './api';
import { submitBody, submitProblem, valuesOf, type FormValues } from './form-values';
import { useAutosave } from './use-autosave';

/**
 * One student's report on the form (R-REP-02): local values, debounced draft autosave while a
 * draft, submit (first send or «حفظ التعديل») with the same validation as the API.
 */
export function useReportEntry(initial: ReportView) {
  const queryClient = useQueryClient();
  const [report, setReport] = useState(initial);
  const [values, setValues] = useState<FormValues>(() => valuesOf(initial));
  const [problem, setProblem] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: submitReport,
    onSuccess: async (view) => {
      setReport(view);
      setValues(valuesOf(view));
      // The lesson moved (completed …) and the pending list shrank; the form keeps its own state.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: LESSONS_KEY }),
        queryClient.invalidateQueries({ queryKey: [...REPORTS_KEY, 'pending'] }),
        queryClient.invalidateQueries({ queryKey: [...REPORTS_KEY, 'student'] }),
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
    const found = submitProblem(values);
    setProblem(found);
    if (!found) submit.mutate({ id: report.id, body: submitBody(values, report.version) });
  };
  const setAttachments = (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) =>
    setReport((r) => ({ ...r, attachments: next(r.attachments) }));

  return { report, values, set, setGrade, send, problem, submit, saveState, setAttachments };
}

export type ReportEntryState = ReturnType<typeof useReportEntry>;
