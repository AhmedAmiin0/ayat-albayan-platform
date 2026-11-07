import { t } from '@/lib/i18n/i18n';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { jumpToMessage } from '@/features/messaging/inbox/messages/lib/jump-to-message';

const c = t.inbox.correction;

/**
 * «صُحِّحت» beside a corrected message's time (owner 2026-11-07): a click scrolls its newest
 * «تصحيح:» reply into view and highlights it, as a quote's click does. Its name is its visible
 * text (WCAG 2.5.3); where it goes is its description (title).
 */
export function CorrectedMark({ correction }: { correction: string }) {
  const actions = useChatActions();
  return (
    <button
      type="button"
      title={c.jump}
      onClick={() => {
        if (!jumpToMessage(correction)) actions.notLoaded();
      }}
      className="rounded-sm font-semibold text-ink-2 underline-offset-2 hover:underline"
    >
      {c.mark}
    </button>
  );
}
