import type { SavedReply } from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { Marked } from './panel/Marked';
import { RowActions } from './MineActions';

export interface ReplyOptionsProps {
  /** The listbox id (the composer or the search box points aria-controls / aria-activedescendant at it). */
  id: string;
  replies: readonly SavedReply[];
  /** What was typed after «/» (or in the search): its letters are bold. */
  query: string;
  active: number;
  onActive: (index: number) => void;
  onPick: (index: number) => void;
  /** «إدارة» in «ردودي»: each row's own edit / delete, outside its option. */
  manage?: { onEdit: (reply: SavedReply) => void; onDelete: (reply: SavedReply) => void } | undefined;
}

/** The option id of row `index`, for aria-activedescendant. */
export const optionId = (listId: string, index: number) => `${listId}-opt-${index}`;

/**
 * The replies as a listbox, each row as WhatsApp Business draws it (owner 2026-10-26): «/title» bold
 * in the accent (isolated, so the slash leads in Arabic and English), the text in the secondary ink on
 * at most two lines, a paperclip when a file goes with it, a hairline between rows; about five rows
 * show, the rest scroll. A mouse click or Enter fills the composer; focus stays in the box.
 */
export function ReplyOptions({ id, replies, query, active, onActive, onPick, manage }: ReplyOptionsProps) {
  return (
    <ul id={id} role="listbox" aria-label={t.savedReplies.listLabel} className="max-h-72 divide-y divide-rule overflow-y-auto overscroll-contain">
      {replies.map((reply, i) => (
        <li key={reply.id} role="none" className="flex items-center gap-1 pe-1">
          <div
            id={optionId(id, i)}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => onActive(i)}
            // mousedown, not click: the composer keeps its focus (and the «/» trigger its text).
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(i);
            }}
            className={cn(
              'flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2 active:bg-neutral-soft',
              i === active ? 'bg-sunk' : 'hover:bg-sunk',
            )}
          >
            <span className="grid min-w-0 flex-1 gap-0.5">
              <bdi className="block truncate text-sm font-semibold text-lapis">
                <Marked text={`/${reply.title}`} query={query} strong="font-extrabold" />
              </bdi>
              <span className="line-clamp-2 text-xs leading-relaxed text-ink-2" dir="auto">
                <Marked text={reply.body} query={query} strong="font-semibold text-ink" />
              </span>
            </span>
            {reply.attachment && (
              <span className="shrink-0 text-ink-3" title={t.savedReplies.hasAttachment}>
                <Icon name="paperclip" className="size-4" />
                <span className="sr-only">{t.savedReplies.hasAttachment}</span>
              </span>
            )}
          </div>
          {manage && <RowActions reply={reply} onEdit={manage.onEdit} onDelete={manage.onDelete} />}
        </li>
      ))}
    </ul>
  );
}
