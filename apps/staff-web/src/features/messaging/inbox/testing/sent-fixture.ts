import type { MessageView, TextSendAnswer } from '@ab/shared';
import { message } from './inbox-fixture';

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

const hexOf = (label: string): string =>
  Array.from(label, (c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

/** A fixed uuid named by a short label (at most 6 ascii characters), so ids stay readable. */
export const uid = (label: string): string =>
  `00000000-0000-4000-8000-${hexOf(label).padStart(12, '0').slice(-12)}`;
