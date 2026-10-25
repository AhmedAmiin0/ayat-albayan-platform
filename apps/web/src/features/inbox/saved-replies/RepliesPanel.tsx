import type { SavedReply, SavedReplyScope } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs } from '@/components/ui/tabs';
import { t } from '@/lib/i18n';
import { MineActions } from './MineActions';
import { optionId, ReplyOptions } from './ReplyOptions';
import type { RepliesPicker } from './use-replies-picker';

const S = t.savedReplies;
const TABS: { value: SavedReplyScope; label: string }[] = [
  { value: 'shared', label: S.tabShared },
  { value: 'mine', label: S.tabMine },
];

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
  if (picker.search || picker.bySlash) return S.noMatch;
  return picker.tab === 'shared' ? S.emptyShared : S.emptyMine;
}

/**
 * «الردود السريعة» above the message box: «المشتركة» / «ردودي», a search (the button's; after «/» the
 * box's own text searches), the list, and in «ردودي» add / edit / delete. Picking only fills the box.
 */
export function RepliesPanel({ picker, listId, onAdd, onEdit, onDelete }: RepliesPanelProps) {
  const { list, keys } = picker;
  const active = list[keys.active];
  return (
    <section
      aria-label={S.title}
      className="grid gap-1.5 rounded-lg border border-rule bg-raised p-2 shadow-pop"
      // After «/» the message box drives the list: a click on a tab or button keeps its focus (and ↑ ↓ Enter Esc).
      onMouseDown={picker.bySlash ? (e) => e.preventDefault() : undefined}
    >
      <div className="flex items-center gap-1">
        <Tabs label={S.title} tabs={TABS} value={picker.tab} onChange={picker.setTab} className="min-w-0 flex-1 text-sm" />
        <IconButton label={t.common.close} className="rounded-full" onClick={picker.close}>
          <Icon name="x" className="size-5" />
        </IconButton>
      </div>
      {!picker.bySlash && (
        <SearchInput
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={active ? optionId(listId, keys.active) : undefined}
          aria-label={S.search}
          placeholder={S.search}
          value={picker.search}
          onChange={(e) => {
            picker.setSearch(e.target.value);
            keys.setActive(0);
          }}
          onKeyDown={(e) => void keys.onKey(e)}
        />
      )}
      {list.length ? (
        <ReplyOptions id={listId} replies={list} active={keys.active} onActive={keys.setActive} onPick={picker.pick} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-2 py-2">
          <p role="status" className="text-sm text-ink-2">
            {emptyText(picker)}
          </p>
          {picker.failed && (
            <Button type="button" size="sm" variant="secondary" onClick={picker.retry}>
              {S.retry}
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {picker.tab === 'mine' && <MineActions active={active} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />}
        <span className="ms-auto hidden text-2xs text-ink-3 pointer-fine:inline">{S.keyboardHint}</span>
      </div>
    </section>
  );
}
