import { useId } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import type { BubbleOffers } from '@/features/messaging/inbox/messages/lib/bubble-offers';

const h = t.inbox.hide;
const item =
  'flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-start text-sm hover:bg-sunk sm:min-h-9';

/**
 * The menu's end (owner 2026-10-30): «تعديل» off on ours with why (only the WhatsApp Business app
 * edits
 * a sent message), then «حذف من المنصة» for staff who may hide it.
 */
export function HideItems({ offers, onPick }: { offers: BubbleOffers; onPick: () => void }) {
  const why = useId();
  return (
    <>
      {offers.noEdit && (
        <>
          <button
            type="button"
            aria-disabled
            aria-describedby={why}
            title={h.noEdit}
            className={`${item} cursor-not-allowed text-ink opacity-45`}
          >
            {t.studentChannel.actions.edit}
          </button>
          <p id={why} className="max-w-64 px-3 pb-1 text-2xs text-ink-3">
            {h.noEdit}
          </p>
        </>
      )}
      {offers.hide && (
        <button type="button" onClick={onPick} className={`${item} text-destructive`}>
          <Icon name="trash" className="text-destructive" />
          {h.action}
        </button>
      )}
    </>
  );
}
