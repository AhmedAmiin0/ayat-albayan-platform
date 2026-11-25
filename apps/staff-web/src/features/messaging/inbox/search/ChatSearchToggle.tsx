import { Icon, IconButton, t } from '@ab/web-kit';
import { useChatSearch } from './search-context';
import { SEARCH_BAR_ID, SEARCH_TOGGLE_ID } from './to-newest';

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
      aria-controls={open ? SEARCH_BAR_ID : undefined}
      className="aria-expanded:bg-sunk aria-expanded:text-ink"
      onClick={open ? search.close : search.open}
    >
      <Icon name="search" />
    </IconButton>
  );
}
