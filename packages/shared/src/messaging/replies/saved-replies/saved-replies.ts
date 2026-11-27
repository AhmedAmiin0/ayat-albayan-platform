import { WA_TEXT_MAX } from '../../schemas';

// Called saved replies since `quickReply` means WhatsApp's buttons; nothing here sends.

export const SAVED_REPLY_TITLE_MAX = 60;
export const SAVED_REPLY_BODY_MAX = WA_TEXT_MAX;
export const SAVED_REPLY_SCOPES = ['shared', 'mine'] as const;
export const SAVED_REPLY_MOVES = ['up', 'down'] as const;

/** The 4xx codes of the saved-replies endpoints. */
export const SAVED_REPLY_ERRORS = [
  'saved_reply_not_found',
  'saved_replies_forbidden',
  'file_path',
  'file_type',
  'file_too_large',
] as const;
