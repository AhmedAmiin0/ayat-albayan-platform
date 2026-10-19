import type { ThreadView } from '@ab/shared';
import { MoreMenu } from '@/components/ui/more-menu';
import { useSalesFamilyActions } from './use-sales-family-actions';

export interface SalesChatActionsProps {
  thread: ThreadView;
  /** Phones: the visible action as an icon button, so the name keeps its space at 375px. */
  compact?: boolean;
}

/**
 * The header actions of a sales chat (R-ASST-01, R-ASST-04, W3): ONE visible secondary action
 * («تسجيل طالب جديد» on a lead, «اشتراك جديد» on a family with her students), then «المزيد» with
 * «تحقق من التسجيل» (docs/16 row 23), the renewals, the transfer and the course days. The dialogs sit
 * outside the menu (they portal, and the menu keeps its entries mounted). Nothing outside sales mode.
 */
export function SalesChatActions({ thread, compact = false }: SalesChatActionsProps) {
  const { primary, items, dialogs } = useSalesFamilyActions({ thread, compact });
  if (!primary && items.length === 0) return null;
  return (
    <span className="ms-auto flex shrink-0 items-center gap-1.5">
      {primary}
      {items.length > 0 && <MoreMenu>{items}</MoreMenu>}
      {dialogs}
    </span>
  );
}
