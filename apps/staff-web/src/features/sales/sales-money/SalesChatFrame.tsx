import type { ChatListRef, ThreadView } from '@ab/shared';
import type { ReactNode } from 'react';
import { useThreadListsAction } from '@/features/messaging/inbox';
import { SalesChatButtons } from './SalesChatActions';
import { useSalesFamilyActions } from './use-sales-family-actions';

export interface SalesChatFrameProps {
  thread: ThreadView;
  /** The chat's lists, shown in the more menu for admin and sales (docs/22 §4). */
  lists?: readonly ChatListRef[] | undefined;
  /** Below 900px: the visible action as an icon button. */
  compact: boolean;
  /** The pane at this width, given the header's actions (null outside sales mode). */
  children: (actions: ReactNode) => ReactNode;
}

/** Dialogs stay at one tree position so crossing 900px with one open keeps it (docs/20 m13). */
export function SalesChatFrame({ thread, lists, compact, children }: SalesChatFrameProps) {
  const { primary, items, dialogs } = useSalesFamilyActions({ thread, compact });
  const listsAction = useThreadListsAction(thread.phone_e164, lists);
  const all = listsAction.item ? [...items, listsAction.item] : items;
  return (
    <>
      {children(<SalesChatButtons primary={primary} items={all} />)}
      {dialogs}
      {listsAction.dialog}
    </>
  );
}
