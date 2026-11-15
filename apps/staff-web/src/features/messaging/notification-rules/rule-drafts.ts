import type { NotificationKey } from '@ab/shared';
import { useCallback, useMemo, useState } from 'react';
import type { RuleDraft } from './rule-draft';

/**
 * The unsaved row drafts of «الإشعارات», keyed by rule key. They live above the audience tabs and
 * above «التواصل»'s tabs (CommunicationsBody holds them, like the timing form), so a switch keeps
 * them; the leave guard names them. A row only ever stores a draft that differs from its rule.
 */
export interface RuleDrafts {
  get: (key: NotificationKey) => RuleDraft | undefined;
  /** Stores the row's draft; null drops it (saved, undone, discarded, or typed back). */
  put: (key: NotificationKey, draft: RuleDraft | null) => void;
  /** The rows with an unsaved draft, in the order first edited. */
  keys: readonly NotificationKey[];
}

type Drafts = Partial<Record<NotificationKey, RuleDraft>>;

/** The map with `key` set to `draft`, or without it (null). */
export function placeRuleDraft(all: Drafts, key: NotificationKey, draft: RuleDraft | null): Drafts {
  if (draft) return { ...all, [key]: draft };
  if (!(key in all)) return all;
  return Object.fromEntries(Object.entries(all).filter(([k]) => k !== key));
}

/** One map of drafts for every row of «الإشعارات». */
export function useRuleDrafts(): RuleDrafts {
  const [drafts, setDrafts] = useState<Drafts>({});
  const put = useCallback((key: NotificationKey, draft: RuleDraft | null) => setDrafts((all) => placeRuleDraft(all, key, draft)), []);
  const keys = useMemo(() => Object.keys(drafts) as NotificationKey[], [drafts]);
  return useMemo(() => ({ get: (key) => drafts[key], put, keys }), [drafts, put, keys]);
}

/** Outside any holder (a read-only render): nothing is kept. */
export const NO_DRAFTS: RuleDrafts = { get: () => undefined, put: () => undefined, keys: [] };
