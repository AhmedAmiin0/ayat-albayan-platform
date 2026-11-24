import { t, IconButton, useTheme } from '@ab/mobile-kit';
import { SearchIcon } from '@/inbox/shared/chat-icons';
import { useChatSearch } from './search-context';

/** Only where the header has no menu, i.e. a teacher's chat. */
export function ChatSearchButton() {
  const { color } = useTheme();
  const search = useChatSearch();
  if (!search) return null;
  return (
    <IconButton label={t.inbox.chatSearch.open} onPress={search.open}>
      <SearchIcon color={color.lapis} />
    </IconButton>
  );
}
