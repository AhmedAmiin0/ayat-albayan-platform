import type { CustomConfigView } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';

const c = t.config.custom;

/** One custom entry: its key (LTR), a value preview, public or private, edit and delete. */
export function CustomEntryRow({ entry, onEdit, onDelete }: { entry: CustomConfigView; onEdit: () => void; onDelete: () => void }) {
  const preview = JSON.stringify(entry.value);
  return (
    <li className="grid gap-1 border-b border-rule py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <bdi dir="ltr" className="font-mono text-sm font-semibold">{entry.key}</bdi>
        <StatusChip tone={entry.isPublic ? 'act' : 'neutral'} glyph={entry.isPublic ? 'hollow' : 'fill'} size="sm" label={entry.isPublic ? c.public : c.private} />
        <span className="ms-auto flex gap-1">
          <Button type="button" size="sm" variant="secondary" onClick={onEdit}>{c.edit}</Button>
          <Button type="button" size="sm" variant="danger-quiet" onClick={onDelete}>{c.delete}</Button>
        </span>
      </div>
      {entry.description && <p className="text-xs text-ink-3">{entry.description}</p>}
      <bdi dir="ltr" className="truncate font-mono text-xs text-ink-2">{preview.length > 120 ? `${preview.slice(0, 120)}…` : preview}</bdi>
    </li>
  );
}
