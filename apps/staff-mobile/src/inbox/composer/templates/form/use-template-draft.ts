import { useState } from 'react';
import type { Draft } from './draft-input';

export type SetDraft = (patch: Partial<Draft>) => void;

/** The form's words in one state: every field writes its part. */
export function useTemplateDraft(initial: Draft): { draft: Draft; set: SetDraft } {
  const [draft, setDraft] = useState(initial);
  const set: SetDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));
  return { draft, set };
}
