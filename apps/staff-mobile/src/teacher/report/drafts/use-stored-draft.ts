import { useEffect, useEffectEvent, useState } from 'react';
import type { z } from 'zod';
import { dropStoredDraft, parseStored, readStoredDraft } from './draft-storage';

interface StoredDraftInput<T> {
  id: string;
  /** Only a draft report restores; a sent one shows the server's copy. */
  enabled: boolean;
  schema: z.ZodType<T>;
  /**
   * The form's current draft body. Its first value is the server's draft: a copy typed against
   * another one is stale and dropped. Once it changed, the teacher's own typing wins.
   */
  body: string;
  restore: (draft: T) => void;
}

type Kept = Awaited<ReturnType<typeof readStoredDraft>>;

/** Puts the body this phone kept for the report back into the form when the card opens. */
export function useStoredDraft<T>(input: StoredDraftInput<T>): void {
  const { id, enabled, schema } = input;
  const [first] = useState(input.body);
  const isStale = (kept: Kept): boolean => kept !== null && kept.base !== first;
  const apply = useEffectEvent((kept: Kept) => {
    if (isStale(kept)) return void dropStoredDraft(id);
    const draft = parseStored(schema, kept?.body ?? null);
    if (draft !== null && input.body === first) input.restore(draft);
  });
  useEffect(() => {
    if (!enabled) return;
    let open = true;
    void readStoredDraft(id).then((kept) => {
      if (open) apply(kept);
    });
    return () => {
      open = false;
    };
  }, [id, enabled, schema]);
}
