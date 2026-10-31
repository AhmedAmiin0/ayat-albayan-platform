import type { MessageView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';

/** WhatsApp refused it: more than 24 h since their last message (final, never retried). */
const refusedAfterWindow = (m: MessageView): boolean =>
  m.direction === 'outbound' && m.status === 'failed' && m.error_code === '131047';

/**
 * Under a text WhatsApp refused after the 24 h window (owner 2026-10-31): «أرسل قالبًا» opens the
 * composer's templates (ChatActions.askTemplate). Only in a chat she may write in (admin,
 * sales; never teacher mode).
 */
export function AskTemplateButton({ message }: { message: MessageView }) {
  const { enabled, askTemplate } = useChatActions();
  if (!enabled || !refusedAfterWindow(message)) return null;
  return (
    <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={askTemplate}>
      {t.inbox.composer.sendTemplate}
    </Button>
  );
}
