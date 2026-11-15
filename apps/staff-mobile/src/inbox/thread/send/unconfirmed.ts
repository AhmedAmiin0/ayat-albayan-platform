import { SEND_UNCONFIRMED } from '@ab/client-core';
import type { MessageView } from '@ab/shared';

// docs/44 BUG7: a send that ended WITHOUT an answer (the 30 s deadline, a dropped connection, a
// 5xx) may have reached the server. Its bubble stays, marked «unconfirmed», until a send with its
// pinned id gets an answer (pinned-send).

/** A provisional row whose send ended with no answer: «لم يتأكد الإرسال بعد». */
export const isUnconfirmed = (m: Pick<MessageView, 'status' | 'error_code'>): boolean =>
  m.status === 'queued' && m.error_code === SEND_UNCONFIRMED;

/** The provisional row marked «unconfirmed» (client-core: the same edit as web). */
export { markUnconfirmed } from '@ab/client-core';
