import { AUTOSAVE_MS, draftBody, shouldSave, type DraftBody, type FormValues } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDebounced } from '@/features/finance/pricing/use-debounced';
import { saveDraft } from '../api';

export type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: Date } | { kind: 'failed' };

export interface DraftSaveInput {
  /** The draft body as JSON (compared as text, so an unchanged form never saves). */
  body: string;
  enabled: boolean;
  save: (body: string) => Promise<unknown>;
}

/** Debounced save of a draft body while `enabled`; `saveNow` sends the current body at once («احفظ مسودة»). */
export function useDraftSave(input: DraftSaveInput): { state: SaveState; saveNow: () => void } {
  const { body } = input;
  const settled = useDebounced(body, AUTOSAVE_MS);
  const [saved, setSaved] = useState(body);
  const [failed, setFailed] = useState<string | null>(null);
  const [result, setResult] = useState<SaveState>({ kind: 'idle' });
  const save = useMutation({
    mutationFn: input.save,
    onSuccess: (_view, b) => {
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
  const saveNow = () => {
    if (input.enabled && !pending && body !== saved) mutate(body);
  };
  return { state: pending ? { kind: 'saving' } : result, saveNow };
}

/** Debounced PUT /reports/:id/draft of the whole form while it is a draft. */
export function useAutosave(input: { id: string; values: FormValues; enabled: boolean }): SaveState {
  const { id } = input;
  return useDraftSave({
    body: JSON.stringify(draftBody(input.values)),
    enabled: input.enabled,
    save: (b) => saveDraft({ id, body: JSON.parse(b) as DraftBody }),
  }).state;
}
