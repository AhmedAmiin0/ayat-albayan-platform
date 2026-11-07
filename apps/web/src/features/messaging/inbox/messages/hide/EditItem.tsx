import { useId } from 'react';
import { t } from '@/lib/i18n/i18n';
import type { BubbleOffers } from '@/features/messaging/inbox/messages/lib/bubble-offers';

const item =
  'flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-start text-sm hover:bg-sunk sm:min-h-9';

export interface EditItemProps {
  offers: Pick<BubbleOffers, 'edit' | 'noEdit'>;
  /** Starts «تعديل» in the composer; absent while the 24 h window is closed (then it is off). */
  onEdit?: (() => void) | undefined;
  /** Why «تعديل» is off now (the closed-window notice). */
  blocked?: string | null;
}

/** «تعديل» shown off with why: only the text she sent is corrected, by a new «تصحيح» message. */
function NoEdit() {
  const why = useId();
  return (
    <>
      <button
        type="button"
        aria-disabled
        aria-describedby={why}
        title={t.inbox.hide.noEdit}
        className={`${item} cursor-not-allowed text-ink opacity-45`}
      >
        {t.studentChannel.actions.edit}
      </button>
      <p id={why} className="max-w-64 px-3 pb-1 text-2xs text-ink-3">
        {t.inbox.hide.noEdit}
      </p>
    </>
  );
}

/**
 * «تعديل» in the bubble menu (owner 2026-11-07): WhatsApp's API cannot edit a sent message, so on
 * her own sent text (any for the admin) it opens the box with the text to send a «تصحيح:» reply;
 * on our other messages it is shown off with why.
 */
export function EditItem({ offers, onEdit, blocked }: EditItemProps) {
  if (offers.noEdit) return <NoEdit />;
  if (!offers.edit) return null;
  return (
    <button
      type="button"
      aria-disabled={onEdit ? undefined : true}
      title={blocked ?? undefined}
      onClick={onEdit}
      className={`${item} text-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-45`}
    >
      {t.inbox.correction.action}
    </button>
  );
}
