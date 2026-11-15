import type { AcademySettings } from '@ab/shared';
import type { RowSaves } from './use-row-saves';
import { useValueDrafts, type ValueDrafts } from './use-value-drafts';

/**
 * The drafts of «القيم», wired to the row saves: an edit or a new value ends a failed save's «أعد
 * المحاولة»; dropping the edit («تراجع», «اعتمد القيمة الجديدة») also ends a conflict. `raw` is the
 * plain drafts (a landed save drops its edit without touching the status).
 */
export function useTrackedDrafts(settings: AcademySettings, saves: RowSaves): { raw: ValueDrafts; drafts: ValueDrafts } {
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
