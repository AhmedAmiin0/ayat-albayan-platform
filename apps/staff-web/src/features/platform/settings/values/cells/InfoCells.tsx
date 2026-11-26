import type { SettingMeta } from '@ab/settings';
import { formatDateTime } from '@/features/sales/leads';
import { t, useClock, type Clock } from '@ab/web-kit';

const v = t.settingsValues;

export function lastChangeText(meta: SettingMeta | undefined, clock: Clock): string {
  if (!meta) return v.never;
  const at = formatDateTime(meta.updatedAt, clock);
  return meta.updatedByName ? v.lastBy.replace('{name}', meta.updatedByName).replace('{at}', at) : at;
}

/** The default, with the bounds under it (their id describes the editor). */
export function DefaultCell({
  text,
  note,
  noteId,
}: {
  text: string;
  note?: string | undefined;
  noteId?: string;
}) {
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
  /** An unsaved row shows the stored value instead of who changed it. */
  unsavedWas?: string | undefined;
}

/** Who and when, never changed, or unsaved with the stored value for a dirty row. */
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
