import { AUTOSAVE_MS, draftBody, shouldSave, type DraftBody, type FormValues, type ReportFormResponse, type ReportView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { pathKey } from '@ab/mobile-kit';
import { dropIfRefused, dropStoredDraft, keepStoredDraft, useOnResume } from '@/teacher/report/drafts';
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

/** What a draft PUT sends (a JSON string, so a settled value compares by content) and its route. */
interface DraftSaver {
  id: string;
  body: string;
  enabled: boolean;
  save: (body: string) => Promise<ReportView>;
}

/**
 * Debounced draft save while `enabled` (R-REP-02), shared by both form versions. Each saved draft
 * also goes into the saved form, so reopening it (even offline) shows what was typed. `flush`
 * saves the current body now («احفظ مسودة»). Each body is kept on the phone until the server has
 * it; a failed one is sent again once the phone is online or the app is back in front.
 */
export function useDraftAutosave(input: DraftSaver): { state: SaveState; flush: () => void } {
  const client = useQueryClient();
  const settled = useSettled(input.body, AUTOSAVE_MS);
  const [saved, setSaved] = useState(input.body);
  const [failed, setFailed] = useState<string | null>(null);
  const [result, setResult] = useState<SaveState>({ kind: 'idle' });
  const save = useMutation({
    mutationFn: async (b: string) => {
      await keepStoredDraft(input.id, { body: b, base: saved });
      return input.save(b);
    },
    onSuccess: (view, b) => {
      void dropStoredDraft(input.id);
      client.setQueriesData<ReportFormResponse>({ queryKey: [...pathKey('/reports'), 'form'] }, (old) => withReport(old, view));
      setSaved(b);
      setFailed(null);
      setResult({ kind: 'saved', at: new Date() });
    },
    onError: (e, b) => {
      void dropIfRefused(input.id, e);
      setFailed(b);
      setResult({ kind: 'failed' });
    },
  });
  useOnResume(() => setFailed(null));
  const pending = save.isPending;
  const { mutate } = save;
  useEffect(() => {
    if (shouldSave({ enabled: input.enabled, settled, saved, failed, pending })) mutate(settled);
  }, [input.enabled, settled, saved, failed, pending, mutate]);
  const flush = () => {
    if (input.enabled && !pending) mutate(input.body);
  };
  return { state: pending ? { kind: 'saving' } : result, flush };
}

/** Debounced PUT /reports/:id/draft of the whole v1 form while it is a draft, as on the web. */
export function useAutosave(input: { id: string; values: FormValues; enabled: boolean }): SaveState {
  return useDraftAutosave({
    id: input.id,
    body: JSON.stringify(draftBody(input.values)),
    enabled: input.enabled,
    save: (b) => saveDraft(input.id, JSON.parse(b) as DraftBody),
  }).state;
}
