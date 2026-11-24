import { t } from '@ab/mobile-kit';
import { sendError } from '@/inbox/messages/hooks/message-text';
import { unanswered } from './after-send';

/** No answer is reported as unconfirmed and safe to resend with the same id (docs/44 BUG7). */
export const chatSendError = (error: unknown): string =>
  unanswered(error) ? t.inbox.error.send_unconfirmed : sendError(error);
