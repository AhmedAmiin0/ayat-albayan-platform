import type { MenuOffers } from '@ab/client-core';
import type { KeyboardEvent, ReactNode } from 'react';
import { ChatGlyph } from '#/components/channel/bubble/ChatGlyph.tsx';
import { Icon } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';
import type { MenuPick } from './use-bubble-editing';

interface Props {
  offers: MenuOffers;
  mine: boolean;
  /** Closes the menu (focus back on ⋯), then runs the pick. */
  onPick: (what: MenuPick) => void;
  /** Esc on an item: closes the menu only, never the panel around the chat. */
  onEscape: () => void;
}

const c = t.studentChannel;
const item =
  'ab-press flex min-h-11 w-full items-center gap-2.5 rounded-sm px-3 text-start text-sm ' +
  'text-ink hover:bg-sunk sm:min-h-9';

/** The menu's rows in the boards' order (FamChatWebMenu): its words and glyph. */
const ROWS: readonly { pick: MenuPick; label: string; glyph: ReactNode; danger?: true }[] = [
  { pick: 'reply', label: c.reply.action, glyph: <Icon name="reply" /> },
  { pick: 'edit', label: c.actions.edit, glyph: <ChatGlyph name="pencil" /> },
  { pick: 'delete', label: c.actions.deleteForAll, glyph: <Icon name="trash" />, danger: true },
  { pick: 'reads', label: c.reads.action, glyph: <ChatGlyph name="info" /> },
];

/**
 * The open menu: «ردّ», «تعديل», «حذف للجميع», «معلومات الرسالة», each only where it is offered
 * now (plain buttons like the inbox's; the first takes focus). It pops in from its ⋯.
 */
export function ChannelMenuItems({ offers, mine, onPick, onEscape }: Props) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    onEscape();
  };
  const shown = ROWS.filter((row) => offers[row.pick]);
  return (
    <div
      className={cn(
        'absolute top-full z-30 mt-1 grid w-max min-w-44 animate-pop-in gap-0.5 rounded-md',
        'border border-rule bg-card p-1.5 shadow-pop',
        // Toward the middle of the thread: mine sit at the inline end, the others' at the start.
        mine ? 'end-0' : 'start-0',
      )}
    >
      {shown.map((row, i) => (
        <button
          key={row.pick}
          type="button"
          className={cn(item, row.danger && 'text-destructive')}
          onKeyDown={onKeyDown}
          ref={i === 0 ? (el) => el?.focus() : undefined}
          onClick={() => onPick(row.pick)}
        >
          {row.glyph}
          {row.label}
        </button>
      ))}
    </div>
  );
}
