import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import type { BubbleOffers } from '@/features/messaging/inbox/messages/lib/bubble-offers';
import { EditItem, type EditItemProps } from './EditItem';

const h = t.inbox.hide;
const item =
  'flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-start text-sm hover:bg-sunk sm:min-h-9';

export interface HideItemsProps extends Omit<EditItemProps, 'offers'> {
  offers: BubbleOffers;
  onPick: () => void;
}

/**
 * The menu's end: «تعديل» (owner 2026-11-07: a «تصحيح:» reply to her own sent text, else off with
 * why), then «حذف من المنصة» for staff who may hide it (owner 2026-10-30).
 */
export function HideItems({ offers, onPick, ...edit }: HideItemsProps) {
  return (
    <>
      <EditItem offers={offers} {...edit} />
      {offers.hide && (
        <button type="button" onClick={onPick} className={`${item} text-destructive`}>
          <Icon name="trash" className="text-destructive" />
          {h.action}
        </button>
      )}
    </>
  );
}
