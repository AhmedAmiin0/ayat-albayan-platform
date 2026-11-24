import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { jumpToMessage } from '@/features/messaging/inbox/messages/lib/jump-to-message';

const c = t.inbox.correction;

/** Its name is its visible text (WCAG 2.5.3); its destination is the title. */
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
