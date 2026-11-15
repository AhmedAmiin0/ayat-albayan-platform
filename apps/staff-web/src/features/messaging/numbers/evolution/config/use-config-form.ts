import type { NumberEvolutionView, NumberView } from '@ab/shared';
import { useState, type SubmitEvent } from 'react';
import { useSaveEvolutionConfig } from '@/features/messaging/numbers/evolution/sync/use-evolution-sync';
import { checkConfig } from './config-check';
import {
  draftOfConfig,
  patchSection,
  type ConfigDraft,
  type ConfigErrors,
  type ConfigSection,
} from './config-draft';

/**
 * «إعدادات Evolution»: the draft from the saved options, each field's problem once submitted, and
 * the PUT (only a draft that passes evolutionConfigSchema is sent).
 */
export function useConfigForm(view: NumberView, evolution: NumberEvolutionView) {
  const [draft, setDraft] = useState(() => draftOfConfig(evolution.config));
  const [errors, setErrors] = useState<ConfigErrors>({});
  const { save, answer } = useSaveEvolutionConfig();
  const set =
    <K extends ConfigSection>(key: K) =>
    (patch: Partial<ConfigDraft[K]>) =>
      setDraft((d) => patchSection(d, key, patch));
  const submit = (ev: SubmitEvent) => {
    ev.preventDefault();
    const checked = checkConfig(draft, evolution.mode);
    setErrors(checked.errors ?? {});
    if (checked.config) save.mutate({ id: view.id, config: checked.config });
  };
  return { draft, errors, set, submit, save, answer };
}
