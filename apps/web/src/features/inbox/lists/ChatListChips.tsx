import type { ChatList } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CHIP_CLASS, ListChip } from './ListChip';

const L = t.inbox.lists;

export interface ChatListChipsProps {
  lists: readonly ChatList[];
  /** The shown list; undefined = «الكل». */
  active: string | undefined;
  onPick: (list: string | undefined) => void;
  onNew: () => void;
  onEdit: () => void;
}

/**
 * «الكل», each list by name (with its count), then «＋ قائمة جديدة» (docs/22 §4). The row scrolls
 * sideways inside itself and never widens the page (#120: min-w-0 + overflow-x-auto; the padding keeps
 * the focus outline inside the scroll box). «تعديل القائمة» sits beside the row while a list is shown.
 */
export function ChatListChips({ lists, active, onPick, onNew, onEdit }: ChatListChipsProps) {
  const current = lists.find((l) => l.id === active);
  return (
    <div className="mb-3 flex min-w-0 items-center gap-1">
      <ul aria-label={L.rowLabel} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto p-1 [scrollbar-width:thin]">
        <li className="shrink-0">
          <ListChip pressed={!current} onClick={() => onPick(undefined)}>
            {L.all}
          </ListChip>
        </li>
        {lists.map((l) => (
          <li key={l.id} className="shrink-0">
            <ListChip pressed={l.id === current?.id} onClick={() => onPick(l.id)}>
              <span className="max-w-40 truncate">{l.name}</span>
              <span className="text-ink-3 tabular-nums">{l.count}</span>
            </ListChip>
          </li>
        ))}
        <li className="shrink-0">
          <button type="button" onClick={onNew} className={cn(CHIP_CLASS, 'border-dashed border-rule-strong bg-transparent font-semibold text-lapis')}>
            <Icon name="plus" className="size-3.5" />
            {L.new}
          </button>
        </li>
      </ul>
      {current && (
        <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={onEdit} aria-label={L.editNamed.replace('{name}', current.name)}>
          <Icon name="sliders" />
          <span className="max-sm:sr-only">{L.edit}</span>
        </Button>
      )}
    </div>
  );
}
