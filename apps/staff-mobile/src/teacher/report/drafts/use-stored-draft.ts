import { useEffect, useEffectEvent, useState } from 'react';
import type { z } from 'zod';
import { parseStored, readStoredDraft } from './draft-storage';

interface StoredDraftInput<T> {
  id: string;
  /** Only a draft report restores; a sent one shows the server's copy. */
  enabled: boolean;
  schema: z.ZodType<T>;
  /** The form's current draft body: once it changed, the teacher's own typing wins. */
  body: string;
  restore: (draft: T) => void;
}

/** Puts the body this phone kept for the report back into the form when the card opens. */
export function useStoredDraft<T>(input: StoredDraftInput<T>): void {
  const { id, enabled, schema } = input;
  const [first] = useState(input.body);
  const apply = useEffectEvent((draft: T | null) => {
    if (draft !== null && input.body === first) input.restore(draft);
  });
  useEffect(() => {
    if (!enabled) return;
    let open = true;
    void readStoredDraft(id).then((raw) => {
      if (open) apply(parseStored(schema, raw));
    });
    return () => {
      open = false;
    };
  }, [id, enabled, schema]);
}
