import type { AcademySettings } from '@ab/settings';
import type { RowSaves } from './use-row-saves';
import { useValueDrafts, type ValueDrafts } from './use-value-drafts';

/** An edit ends a failed save's retry; dropping the edit also ends a conflict. */
export function useTrackedDrafts(
  settings: AcademySettings,
  saves: RowSaves,
): { raw: ValueDrafts; drafts: ValueDrafts } {
  const raw = useValueDrafts(settings);
  const drafts: ValueDrafts = {
    ...raw,
    edit: (key, patch) => {
      saves.clearFailed(key);
      raw.edit(key, patch);
    },
    put: (key, form) => {
      saves.clearFailed(key);
      raw.put(key, form);
    },
    discard: (key) => {
      saves.clear(key);
      raw.discard(key);
    },
  };
  return { raw, drafts };
}
