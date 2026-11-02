import { t } from '@/core/lib/i18n/i18n';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { useTheme } from '@/theme';
import { SearchIcon } from '@/inbox/shared/chat-icons';
import { useChatSearch } from './search-context';

/** «بحث» as an icon where the header has no «⋮» (a teacher's chat); the menu has it otherwise. */
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
