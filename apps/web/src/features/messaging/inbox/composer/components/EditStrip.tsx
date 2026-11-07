import type { RefObject } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n/i18n';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { getDraft, keptFailed, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { quoteOf, quoteText } from '@/features/messaging/inbox/messages/lib/quote';

const c = t.inbox.correction;

export interface EditStripProps {
  phone: string;
  /** After ✕ the focus goes back to the box. */
  returnFocus: RefObject<HTMLElement | null>;
}

/**
 * «تعديل الرسالة» above the box (owner 2026-11-07), as WhatsApp: the original's first line and ✕
 * (which empties the box), then one line on what the family gets (a new «تصحيح:» reply). Nothing
 * while no message is being corrected.
 */
export function EditStrip({ phone, returnFocus }: EditStripProps) {
  const { editing, cancelEdit } = useChatActions();
  if (!editing) return null;
  const cancel = () => {
    cancelEdit();
    setDraft(phone, { text: '', failed: keptFailed(getDraft(phone).failed) });
    returnFocus.current?.focus();
  };
  return (
    <div className="grid gap-1">
      <div
        role="group"
        aria-label={c.bar}
        className="flex min-h-11 items-center gap-2 rounded-md border-s-[3px] border-lapis bg-lapis-wash ps-2.5 text-xs sm:min-h-10"
      >
        <p className="grid min-w-0 flex-1">
          <span className="font-semibold text-lapis">{c.bar}</span>
          <span className="truncate text-ink-2" dir="auto">
            {quoteText(quoteOf(editing))}
          </span>
        </p>
        <IconButton label={c.cancel} className="rounded-full" onClick={cancel}>
          <Icon name="x" className="size-4" />
        </IconButton>
      </div>
      <p className="px-1 text-2xs text-ink-3">{c.note}</p>
    </div>
  );
}
