import { AUTOSAVE_MS, shouldSave } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useState } from 'react';
import { NO_STORE, savesNow, subscribeOnline } from './draft-rules';
import type {
  DraftSave,
  DraftSaveInput,
  DraftText,
  SaveState,
  SubscribeResume,
} from './draft.types';

const IDLE: SaveState = { kind: 'idle' };
const SAVING: SaveState = { kind: 'saving' };
const FAILED: SaveState = { kind: 'failed' };
const ignore = (): void => undefined;

function useSettled<B>(draft: DraftText<B>): DraftText<B> {
  const [settled, setSettled] = useState(draft);
  const settle = useEffectEvent(() => setSettled(draft));
  useEffect(() => {
    const timer = setTimeout(() => settle(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft.text]);
  return settled;
}

function useOnResume(subscribe: SubscribeResume, onResume: () => void): void {
  const resume = useEffectEvent(onResume);
  useEffect(() => subscribe(() => resume()), [subscribe]);
}

/**
 * Debounced draft save while `enabled` (R-REP-02), one implementation for web and phone. A failed
 * body is retried when `subscribeResume` fires (online by default); `store` keeps it meanwhile.
 */
export function useDraftSave<B, V>(input: DraftSaveInput<B, V>): DraftSave {
  const { id, enabled } = input;
  const {
    store = NO_STORE,
    onSaved = ignore,
    subscribeResume = subscribeOnline,
  } = input.ports ?? {};
  const draft = { text: JSON.stringify(input.body), body: input.body };
  const settled = useSettled(draft);
  const [saved, setSaved] = useState(draft.text);
  const [failed, setFailed] = useState<string | null>(null);
  const [result, setResult] = useState<SaveState>(IDLE);
  const save = useMutation({
    mutationFn: async (next: DraftText<B>) => {
      await store.keep(id, { body: next.text, base: saved });
      return input.save(next.body);
    },
    onSuccess: async (view, next) => {
      onSaved(view);
      setSaved(next.text);
      setFailed(null);
      setResult({ kind: 'saved', at: new Date() });
      await store.drop(id);
    },
    onError: async (error, next) => {
      setFailed(next.text);
      setResult(FAILED);
      await store.dropIfRefused(id, error);
    },
  });
  useOnResume(subscribeResume, () => setFailed(null));
  const pending = save.isPending;
  const { mutate } = save;
  useEffect(() => {
    if (shouldSave({ enabled, settled: settled.text, saved, failed, pending })) mutate(settled);
  }, [enabled, settled, saved, failed, pending, mutate]);
  const saveNow = () => {
    if (savesNow({ enabled, pending })) mutate(draft);
  };
  return { state: pending ? SAVING : result, saveNow };
}
