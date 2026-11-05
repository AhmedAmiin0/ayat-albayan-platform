import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { useSideSheetClose } from '@/features/messaging/inbox/shared/side-sheet';
import { useChatSearch } from './search-context';
import { SEARCH_BAR_ID } from './to-newest';

/** The bar's field, when the bar is already open (it focuses itself when it opens). */
const focusBar = (): void =>
  document.querySelector<HTMLInputElement>(`#${SEARCH_BAR_ID} input`)?.focus();

/**
 * «بحث في الرسائل» at the top of the contact's panel (docs/37 NEW 2): opens the chat's search
 * bar and puts the cursor in it; on a phone it also closes the panel's sheet. Outside a chat
 * (no search provider) it renders nothing.
 */
export function SearchFromProfile() {
  const search = useChatSearch();
  const closeSheet = useSideSheetClose();
  if (!search) return null;
  const go = () => {
    closeSheet?.();
    search.open();
    focusBar();
  };
  return (
    <Button type="button" variant="secondary" className="w-full justify-start gap-2" onClick={go}>
      <Icon name="search" />
      {t.inbox.chatSearch.fromProfile}
    </Button>
  );
}
