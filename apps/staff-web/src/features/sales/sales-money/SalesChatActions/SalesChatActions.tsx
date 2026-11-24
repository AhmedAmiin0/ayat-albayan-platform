import type { ThreadView } from '@ab/shared';
import type { ReactNode } from 'react';
import { MoreMenu } from '@ab/web-kit/components/ui/overlay/more-menu';
import { useSalesFamilyActions } from '@/features/sales/sales-money/use-sales-family-actions';

export interface SalesChatActionsProps {
  thread: ThreadView;
  /** Phones: the visible action as an icon button, so the name keeps its space at 375px. */
  compact?: boolean;
}

/** Dialogs stay in SalesChatFrame, not here. */
export function SalesChatButtons({ primary, items }: { primary: ReactNode; items: ReactNode[] }) {
  if (!primary && items.length === 0) return null;
  return (
    <span className="ms-auto flex shrink-0 items-center gap-1.5">
      {primary}
      {items.length > 0 && <MoreMenu>{items}</MoreMenu>}
    </span>
  );
}

/** One visible secondary action, the rest in the more menu (R-ASST-01/04, docs/16 row 23). */
export function SalesChatActions({ thread, compact = false }: SalesChatActionsProps) {
  const { primary, items, dialogs } = useSalesFamilyActions({ thread, compact });
  return (
    <>
      <SalesChatButtons primary={primary} items={items} />
      {dialogs}
    </>
  );
}
