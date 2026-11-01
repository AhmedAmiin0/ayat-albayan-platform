import type { SavedReplyScope } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { SearchInput } from '@/components/ui/form/search-input';
import { Tabs } from '@/components/ui/layout/tabs';
import { t } from '@/lib/i18n/i18n';
import { optionId } from '@/features/messaging/inbox/saved-replies/components/ReplyOptions';
import type { RepliesPicker } from '@/features/messaging/inbox/saved-replies/hooks/use-replies-picker';

const S = t.savedReplies;
const TABS: { value: SavedReplyScope; label: string }[] = [
  { value: 'shared', label: S.tabShared },
  { value: 'mine', label: S.tabMine },
];

/**
 * The button's panel head: «المشتركة / ردودي», «إدارة» (her own replies' add / edit / delete, kept off
 * the pick list as WhatsApp does), close, and its own search driving the list (↑ ↓ Enter Esc).
 */
export function PanelHead({ picker, listId }: { picker: RepliesPicker; listId: string }) {
  const { list, keys } = picker;
  return (
    <div className="grid gap-1.5 px-2 pt-2">
      <div className="flex items-center gap-1">
        <Tabs label={S.title} tabs={TABS} value={picker.tab} onChange={picker.setTab} className="min-w-0 flex-1 text-sm" />
        <Button type="button" size="sm" variant="ghost" aria-pressed={picker.manage} onClick={() => picker.setManage(!picker.manage)}>
          {picker.manage ? S.manageDone : S.manage}
        </Button>
        <IconButton label={t.common.close} className="rounded-full" onClick={picker.close}>
          <Icon name="x" className="size-5" />
        </IconButton>
      </div>
      <SearchInput
        autoFocus
        role="combobox"
        aria-expanded
        aria-controls={listId}
        aria-activedescendant={list[keys.active] ? optionId(listId, keys.active) : undefined}
        aria-label={S.search}
        placeholder={S.search}
        value={picker.search}
        onChange={(e) => {
          picker.setSearch(e.target.value);
          keys.setActive(0);
        }}
        onKeyDown={(e) => void keys.onKey(e)}
      />
    </div>
  );
}
