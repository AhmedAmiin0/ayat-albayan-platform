import type { ThreadView } from '@ab/shared';
import type { ReactNode } from 'react';
import { SalesChatButtons } from './SalesChatActions';
import { useSalesFamilyActions } from './use-sales-family-actions';

export interface SalesChatFrameProps {
  thread: ThreadView;
  /** Below 900px: the visible action as an icon button. */
  compact: boolean;
  /** The pane at this width, given the header's actions (null outside sales mode). */
  children: (actions: ReactNode) => ReactNode;
}

/**
 * The sales chat's actions held above the width switch (docs/20 m13): the phone and the wide header
 * get only the buttons, while the dialogs and their state (a transfer being typed) stay at one tree
 * position, so crossing 900px with a dialog open keeps it. ThreadPane keys it by phone.
 */
export function SalesChatFrame({ thread, compact, children }: SalesChatFrameProps) {
  const { primary, items, dialogs } = useSalesFamilyActions({ thread, compact });
  return (
    <>
      {children(<SalesChatButtons primary={primary} items={items} />)}
      {dialogs}
    </>
  );
}
