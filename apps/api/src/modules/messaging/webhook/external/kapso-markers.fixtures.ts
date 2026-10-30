// Recorded shapes of the WhatsApp Business app's actions on the chat line (owner 2026-10-30), as
// Meta's smb_message_echoes delivers them and as Kapso's history lists them (the same Meta object
// plus a `kapso` block). Identifiers and phones are replaced; no network in any test.
import { SENT_TS } from './external.fakes';

const FAMILY = '966501234567';
export const ORIGINAL = 'wamid.HBgMOTY2NTAxMjM0NTY3FQIAERgSMEFCQ0RFRjAxMjM0NTY3ODkA';
const later = (s: number) => String(Number(SENT_TS) + s);

const echo = (id: string, part: Record<string, unknown>) => ({
  from: '966536900446',
  to: FAMILY,
  id,
  timestamp: later(30),
  ...part,
});

/** «[edit]» before: the staff fixed a text from the phone app. */
export const EDIT_ECHO = echo('wamid.EDIT1', {
  type: 'edit',
  edit: {
    original_message_id: ORIGINAL,
    message: { type: 'text', text: { body: 'الحلقة الساعة 6 مساءً' } },
  },
});

/** «[revoke]» before: deleted for everyone. */
export const REVOKE_ECHO = echo('wamid.REVOKE1', {
  type: 'revoke',
  revoke: { original_message_id: ORIGINAL },
});

/** «[reaction]» before: a 👍 from the app; an empty emoji removes it. */
export const REACTION_ECHO = echo('wamid.REACT1', {
  type: 'reaction',
  reaction: { message_id: ORIGINAL, emoji: '👍' },
});
export const UNREACT_ECHO = echo('wamid.REACT2', {
  type: 'reaction',
  reaction: { message_id: ORIGINAL, emoji: '' },
});

/** «[image]» / «[document]» before: files with no caption. */
export const IMAGE_ECHO = echo('wamid.IMG1', {
  type: 'image',
  image: { id: '1092837465', mime_type: 'image/jpeg', sha256: 'abc' },
});
export const DOCUMENT_ECHO = echo('wamid.DOC1', {
  type: 'document',
  document: { id: '1092837466', mime_type: 'application/pdf', filename: 'تقرير الحلقة.pdf' },
});

/** A history item: an audio from the app with no mime of its own (Kapso's media_data names it). */
export const AUDIO_ITEM = {
  ...echo('wamid.AUD1', { type: 'audio', audio: { id: '1092837467' } }),
  kapso: {
    direction: 'outbound',
    status: 'delivered',
    media_data: { content_type: 'audio/ogg; codecs=opus' },
  },
};

/** «[errors]» before: the click-to-WhatsApp ad's automatic welcome (origin history_sync). */
export const AD_WELCOME_ITEM = {
  ...echo('wamid.HBgMOTY2NTAxMjM0NTY3FQIAEhgUM0E5RjQ4QjI2', { type: 'errors' }),
  errors: [{ code: 131051, title: 'Unsupported message type' }],
  kapso: {
    direction: 'outbound',
    status: 'delivered',
    origin: 'history_sync',
    message_type: 'errors',
  },
};
export const AD_WELCOME_WITH_TEXT = {
  ...AD_WELCOME_ITEM,
  id: 'wamid.AD2',
  referral: { welcome_message: { text: 'أهلًا بك في أكاديمية آيات البيان، كيف نخدمك؟' } },
};

/** «[unsupported]» before: something the Cloud API cannot read (a poll, a view-once photo). */
export const UNSUPPORTED_ITEM = {
  ...echo('wamid.UNS1', { type: 'unsupported', unsupported: { type: 'poll' } }),
  errors: [{ code: 131051, title: 'Message type unknown' }],
  kapso: { direction: 'outbound', status: 'delivered' },
};
