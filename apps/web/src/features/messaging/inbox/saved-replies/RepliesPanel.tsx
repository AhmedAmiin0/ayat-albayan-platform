import type { SavedReply } from '@ab/shared';
import { useRef } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { MineActions } from './MineActions';
import { PanelHead } from './panel/PanelHead';
import { ReplyOptions } from './ReplyOptions';
import { useOutsideClose } from './panel/use-outside-close';
import type { RepliesPicker } from './use-replies-picker';

const S = t.savedReplies;

export interface RepliesPanelProps {
  picker: RepliesPicker;
  /** The listbox id: the composer's aria-controls while «/» drives it. */
  listId: string;
  onAdd: () => void;
  onEdit: (reply: SavedReply) => void;
  onDelete: (reply: SavedReply) => void;
}

function emptyText(picker: RepliesPicker): string {
  if (picker.failed) return S.loadError;
  if (picker.loading) return t.common.loading;
  if (picker.query) return S.noMatch;
  return picker.tab === 'shared' || picker.bySlash ? S.emptyShared : S.emptyMine;
}

/**
 * «الردود السريعة» docked right above the message box, as WhatsApp Business (owner 2026-10-26). After «/»
 * it is only the list: both tabs, searched by the box's own text, driven from the box (↑ ↓ Enter Esc).
 * From the button it has a head (PanelHead): tabs, «إدارة», its own search. A press outside the
 * composer closes it. Picking only fills the box.
 */
export function RepliesPanel({ picker, listId, onAdd, onEdit, onDelete }: RepliesPanelProps) {
  const { list, keys } = picker;
  const ref = useRef<HTMLElement>(null);
  useOutsideClose(ref, picker.dismiss);
  const managing = !picker.bySlash && picker.manage && picker.tab === 'mine';
  return (
    <section
      ref={ref}
      aria-label={S.title}
      className="grid gap-1 overflow-hidden rounded-lg border border-rule bg-raised pb-1 shadow-pop"
      // After «/» the message box drives the list: a click in it keeps the box's focus (and ↑ ↓ Enter Esc).
      onMouseDown={picker.bySlash ? (e) => e.preventDefault() : undefined}
    >
      {!picker.bySlash && <PanelHead picker={picker} listId={listId} />}
      {list.length ? (
        <ReplyOptions
          {...{ id: listId, replies: list, query: picker.query, active: keys.active, onActive: keys.setActive, onPick: picker.pick }}
          manage={managing ? { onEdit, onDelete } : undefined}
        />
      ) : (
        <div className="grid gap-1 px-3 py-2">
          <p role="status" className="text-sm text-ink-2">
            {emptyText(picker)}
          </p>
          {!picker.failed && !picker.loading && !picker.bySlash && <p className="text-xs text-ink-3">{S.slashHint}</p>}
          {picker.failed && (
            <Button type="button" size="sm" variant="secondary" className="justify-self-start" onClick={picker.retry}>
              {S.retry}
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 px-2 empty:hidden">
        {managing && <MineActions onAdd={onAdd} />}
        <span className="ms-auto hidden text-2xs text-ink-3 pointer-fine:inline">{S.keyboardHint}</span>
      </div>
    </section>
  );
}
