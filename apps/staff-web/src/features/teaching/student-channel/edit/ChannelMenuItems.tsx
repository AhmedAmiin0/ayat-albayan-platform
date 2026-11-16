import type { KeyboardEvent } from 'react';
import type { ChannelActions } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

interface Props {
  offers: ChannelActions;
  mine: boolean;
  /** Closes the menu (focus back on ⋯), then runs the pick. */
  onPick: (what: 'edit' | 'delete') => void;
  /** Esc on an item: closes the menu only, never the panel around the chat. */
  onEscape: () => void;
}

const a = t.studentChannel.actions;
const item =
  'flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-start text-sm text-ink hover:bg-sunk sm:min-h-9';

/** The open menu: «تعديل», «حذف للجميع» (plain buttons like the inbox's; the first takes focus). */
export function ChannelMenuItems({ offers, mine, onPick, onEscape }: Props) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    onEscape();
  };
  return (
    <div
      className={cn(
        'absolute top-full z-30 mt-1 grid w-max min-w-40 gap-0.5 rounded-md border border-rule',
        'bg-card p-1.5 shadow-pop',
        mine ? 'start-0' : 'end-0',
      )}
    >
      {offers.edit && (
        <button
          type="button"
          className={item}
          onKeyDown={onKeyDown}
          ref={(el) => el?.focus()}
          onClick={() => onPick('edit')}
        >
          {a.edit}
        </button>
      )}
      {offers.delete && (
        <button
          type="button"
          className={cn(item, 'text-destructive')}
          onKeyDown={onKeyDown}
          ref={offers.edit ? undefined : (el) => el?.focus()}
          onClick={() => onPick('delete')}
        >
          {a.deleteForAll}
        </button>
      )}
    </div>
  );
}
