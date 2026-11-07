import { t } from '@/core/lib/i18n/i18n';
import { sendError } from '@/inbox/messages/hooks/message-text';
import { unanswered } from './after-send';

/**
 * A chat send's failure in words (useSendMessage: the box, «عرض سعر», a new chat, a resend): no
 * answer says the send is unconfirmed and safe to send again (its id is reused, docs/44 BUG7);
 * the API's refusal says why, as sendError does.
 */
export const chatSendError = (error: unknown): string =>
  unanswered(error) ? t.inbox.error.send_unconfirmed : sendError(error);
