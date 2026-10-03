import { AUTOSAVE_MS, draftBody, shouldSave, type DraftBody, type FormValues, type ReportFormResponse } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { pathKey } from '@/lib/query-keys';
import { saveDraft, withReport } from './api';

export type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: Date } | { kind: 'failed' };

/** `value` once it has stopped changing for `ms`. */
function useSettled(value: string, ms: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

/**
 * Debounced PUT /reports/:id/draft of the whole form while it is a draft (R-REP-02), as on the web.
 * Each saved draft also goes into the saved form, so reopening it (even offline) shows what was typed.
 */
export function useAutosave(input: { id: string; values: FormValues; enabled: boolean }): SaveState {
  const client = useQueryClient();
  const body = JSON.stringify(draftBody(input.values));
  const settled = useSettled(body, AUTOSAVE_MS);
  const [saved, setSaved] = useState(body);
  const [failed, setFailed] = useState<string | null>(null);
  const [result, setResult] = useState<SaveState>({ kind: 'idle' });
  const save = useMutation({
    mutationFn: (b: string) => saveDraft(input.id, JSON.parse(b) as DraftBody),
    onSuccess: (view, b) => {
      client.setQueriesData<ReportFormResponse>({ queryKey: [...pathKey('/reports'), 'form'] }, (old) => withReport(old, view));
      setSaved(b);
      setFailed(null);
      setResult({ kind: 'saved', at: new Date() });
    },
    onError: (_e, b) => {
      setFailed(b);
      setResult({ kind: 'failed' });
    },
  });
  const pending = save.isPending;
  const { mutate } = save;
  useEffect(() => {
    if (shouldSave({ enabled: input.enabled, settled, saved, failed, pending })) mutate(settled);
  }, [input.enabled, settled, saved, failed, pending, mutate]);
  return pending ? { kind: 'saving' } : result;
}
