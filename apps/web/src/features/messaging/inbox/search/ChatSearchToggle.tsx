import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n/i18n';
import { useChatSearch } from './search-context';
import { SEARCH_TOGGLE_ID } from './to-newest';

/** The chat header's «بحث» (as WhatsApp's): opens the bar, or closes it when open. */
export function ChatSearchToggle() {
  const search = useChatSearch();
  if (!search) return null;
  const open = search.state.open;
  return (
    <IconButton
      id={SEARCH_TOGGLE_ID}
      label={t.inbox.chatSearch.open}
      title={t.inbox.chatSearch.label}
      aria-expanded={open}
      onClick={open ? search.close : search.open}
    >
      <Icon name="search" />
    </IconButton>
  );
}
