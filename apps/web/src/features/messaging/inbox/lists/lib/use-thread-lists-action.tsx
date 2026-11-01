import type { ChatListRef } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { ThreadListsDialog } from '@/features/messaging/inbox/lists/components/ThreadListsDialog';
import { useListsAccess } from './use-lists-access';

export interface ThreadListsAction {
  /** «القوائم» for the header's «المزيد» (null without inbox.lists or in teacher mode). */
  item: ReactNode;
  /** The checklist, outside the menu (it portals; SalesChatFrame keeps it across 900px). */
  dialog: ReactNode;
}

/** The open chat's «القوائم» entry and its checklist dialog (docs/22 §4), admin and sales. */
export function useThreadListsAction(phone: string, lists: readonly ChatListRef[] | undefined): ThreadListsAction {
  const access = useListsAccess();
  const [open, setOpen] = useState(false);
  if (!access) return { item: null, dialog: null };
  const item = (
    <Button key="lists" type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
      {t.inbox.lists.title}
    </Button>
  );
  const dialog = open && <ThreadListsDialog phone={phone} lists={lists ?? []} onClose={() => setOpen(false)} />;
  return { item, dialog };
}
