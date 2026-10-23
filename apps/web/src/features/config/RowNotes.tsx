import type { SettingMeta } from '@ab/shared';
import { t } from '@/lib/i18n';
import { formatDateTime } from '../leads/format';

/** Under a setting's hint: «معدَّل» while unsaved, and who changed it last when the server knows. */
export function RowNotes({ dirty, meta }: { dirty: boolean; meta?: SettingMeta | undefined }) {
  if (!dirty && !meta) return null;
  const at = meta ? formatDateTime(meta.updatedAt) : '';
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
