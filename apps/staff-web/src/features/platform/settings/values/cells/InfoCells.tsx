import type { SettingMeta } from '@ab/shared';
import { formatDateTime } from '@/features/sales/leads';
import { t } from '@/lib/i18n/i18n';
import { useClock, type Clock } from '@/lib/clock';

const v = t.settingsValues;

/** «آخر تعديل» as one line of text («أحمد، 21 أكتوبر 14:05»), or «لم تُعدَّل بعد». */
export function lastChangeText(meta: SettingMeta | undefined, clock: Clock): string {
  if (!meta) return v.never;
  const at = formatDateTime(meta.updatedAt, clock);
  return meta.updatedByName ? v.lastBy.replace('{name}', meta.updatedByName).replace('{at}', at) : at;
}

/** «الافتراضي»: the default, and under it the bounds (their id is what the editor is described by). */
export function DefaultCell({ text, note, noteId }: { text: string; note?: string | undefined; noteId?: string }) {
  return (
    <span className="grid gap-0.5 text-sm text-ink-2">
      <span>{text}</span>
      {note && (
        <small id={noteId} className="text-2xs text-ink-3">
          {note}
        </small>
      )}
    </span>
  );
}

export interface LastCellProps {
  meta?: SettingMeta | undefined;
  /** An unsaved row: «لم يُحفظ» and the stored value instead of who changed it. */
  unsavedWas?: string | undefined;
}

/** «آخر تعديل»: who and when (two lines), «لم تُعدَّل بعد», or «لم يُحفظ · المحفوظ: …» for a dirty row. */
export function LastCell({ meta, unsavedWas }: LastCellProps) {
  const clock = useClock();
  if (unsavedWas !== undefined) {
    return (
      <span className="grid gap-0.5 text-xs">
        <span className="font-semibold text-ink-2">{v.unsavedRow}</span>
        <small className="text-ink-3">{v.savedWas.replace('{value}', unsavedWas)}</small>
      </span>
    );
  }
  if (!meta) return <small className="text-xs whitespace-nowrap text-ink-3">{v.never}</small>;
  return (
    <span className="grid gap-0.5 text-xs text-ink-2">
      <span>{meta.updatedByName ?? '—'}</span>
      <small className="text-ink-3">{formatDateTime(meta.updatedAt, clock)}</small>
    </span>
  );
}
