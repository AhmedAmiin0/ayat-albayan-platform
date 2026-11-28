import type { MessageView, TextSendAnswer } from '@ab/shared';
import { message } from './inbox-fixture';

export { uid } from './uid';

/** A send's answer as the API writes it: an outbound row with a uuid id and no made-up lead. */
export const sentRow = (patch: Partial<MessageView> = {}): MessageView =>
  message({ lead_id: null, direction: 'outbound', status: 'queued', ...patch });

/** A text send's answer: its row and whether its request id replayed the first one. */
export const sentText = (patch: Partial<TextSendAnswer> = {}): TextSendAnswer => ({
  replayed: false,
  same_request: false,
  ...sentRow(patch),
  ...patch,
});
