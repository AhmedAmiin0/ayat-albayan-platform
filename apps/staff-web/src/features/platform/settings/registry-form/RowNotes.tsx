import type { SettingMeta } from '@ab/settings';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { formatDateTime } from '@/features/sales/leads';
import { useClock } from '@ab/web-kit/lib/clock';

/** Shows an unsaved mark while dirty, and who changed it last when the server knows. */
export function RowNotes({ dirty, meta }: { dirty: boolean; meta?: SettingMeta | undefined }) {
  const clock = useClock();
  if (!dirty && !meta) return null;
  const at = meta ? formatDateTime(meta.updatedAt, clock) : '';
  const changed = meta?.updatedByName
    ? t.config.changedBy.replace('{at}', at).replace('{name}', meta.updatedByName)
    : t.config.changed.replace('{at}', at);
  return (
    <p className="flex flex-wrap items-center gap-x-3 text-2xs text-ink-3">
      {dirty && <span className="font-semibold text-lapis">{t.config.dirty}</span>}
      {meta && <span>{changed}</span>}
    </p>
  );
}
