import type { ChatListRef } from '@ab/shared';
import { useState } from 'react';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { ListsIcon } from '../shared/chat-icons';
import { ThreadListsSheet } from './ThreadListsSheet';

interface ThreadListsButtonProps {
  phone: string;
  /** The thread detail's `lists` (absent from an API that predates lists). */
  member?: readonly ChatListRef[];
}

/**
 * «القوائم» in a chat's header (admin and assistant trees; ThreadScreen leaves it out in teacher
 * mode): opens the checklist sheet. Only once /auth/me lists inbox.lists.
 */
export function ThreadListsButton({ phone, member = [] }: ThreadListsButtonProps) {
  const { color } = useTheme();
  const allowed = useHolds('inbox.lists');
  const [open, setOpen] = useState(false);
  if (!allowed) return null;
  return (
    <>
      <IconButton label={t.inbox.lists.title} onPress={() => setOpen(true)}>
        <ListsIcon color={color.lapis} />
      </IconButton>
      <ThreadListsSheet phone={phone} member={member} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
