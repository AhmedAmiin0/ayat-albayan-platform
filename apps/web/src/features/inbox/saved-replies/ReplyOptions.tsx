import type { SavedReply } from '@ab/shared';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface ReplyOptionsProps {
  /** The listbox id (the composer or the search box points aria-controls / aria-activedescendant at it). */
  id: string;
  replies: readonly SavedReply[];
  active: number;
  onActive: (index: number) => void;
  onPick: (index: number) => void;
}

/** The option id of row `index`, for aria-activedescendant. */
export const optionId = (listId: string, index: number) => `${listId}-opt-${index}`;

/**
 * The replies as a listbox (a mouse click or Enter fills the composer): the title, the text on one
 * line and a paperclip when the reply carries a file. Focus stays in the box that drives it.
 */
export function ReplyOptions({ id, replies, active, onActive, onPick }: ReplyOptionsProps) {
  return (
    <ul id={id} role="listbox" aria-label={t.savedReplies.listLabel} className="grid max-h-56 gap-px overflow-y-auto">
      {replies.map((reply, i) => (
        <li
          key={reply.id}
          id={optionId(id, i)}
          role="option"
          aria-selected={i === active}
          onMouseEnter={() => onActive(i)}
          // mousedown, not click: the composer keeps its focus (and the «/» trigger its text).
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(i);
          }}
          className={cn('flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5', i === active ? 'bg-accent' : 'hover:bg-sunk')}
        >
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-sm font-semibold text-ink" dir="auto">{reply.title}</span>
            <span className="truncate text-xs text-ink-2" dir="auto">{reply.body}</span>
          </span>
          {reply.attachment && (
            <span className="shrink-0 text-ink-3" title={t.savedReplies.hasAttachment}>
              <Icon name="paperclip" className="size-4" />
              <span className="sr-only">{t.savedReplies.hasAttachment}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
