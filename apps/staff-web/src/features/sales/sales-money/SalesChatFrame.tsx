import type { ChatListRef, ThreadView } from '@ab/shared';
import type { ReactNode } from 'react';
import { useThreadListsAction } from '@/features/messaging/inbox';
import { SalesChatButtons } from './SalesChatActions';
import { useSalesFamilyActions } from './use-sales-family-actions';

export interface SalesChatFrameProps {
  thread: ThreadView;
  /** The chat's lists (ThreadDetail.lists): «القوائم» in «المزيد» for admin and sales (docs/22 §4). */
  lists?: readonly ChatListRef[] | undefined;
  /** Below 900px: the visible action as an icon button. */
  compact: boolean;
  /** The pane at this width, given the header's actions (null outside sales mode). */
  children: (actions: ReactNode) => ReactNode;
}

/**
 * The sales chat's actions held above the width switch (docs/20 m13): the phone and the wide header
 * get only the buttons, while the dialogs and their state (a transfer being typed) stay at one tree
 * position, so crossing 900px with a dialog open keeps it. ThreadPane keys it by phone. The admin's
 * chat gets the same «المزيد» with «القوائم» only (docs/22 §4).
 */
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
