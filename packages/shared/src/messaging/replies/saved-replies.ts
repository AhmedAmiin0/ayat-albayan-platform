import { z } from 'zod';
import { CHAT_SEND_MIMES, type ChatSendMime } from '../chat/chat-files.js';
import { WA_TEXT_MAX } from '../schemas.js';

// «الردود السريعة» (owner 2026-10-25): saved replies staff insert into the chat composer. Named
// «saved replies» in code: `quickReply` is WhatsApp's interactive reply buttons (quick-reply.ts).
// A shared reply (owner_profile_id null) is seen by everyone with the inbox and written with
// saved_replies.manage; a personal one («ردودي») is its owner's alone. Nothing here sends anything.

export const SAVED_REPLY_TITLE_MAX = 60;
export const SAVED_REPLY_BODY_MAX = WA_TEXT_MAX;
export const SAVED_REPLY_SCOPES = ['shared', 'mine'] as const;
export type SavedReplyScope = (typeof SAVED_REPLY_SCOPES)[number];

/** A reply's optional image or PDF, sent after its text through the chat's own file send. */
export interface SavedReplyAttachment {
  name: string;
  mime: ChatSendMime;
  size: number;
}

/** GET /saved-replies: the shared list, then the caller's own, each by position then title. */
export interface SavedReply {
  id: string;
  scope: SavedReplyScope;
  title: string;
  body: string;
  attachment: SavedReplyAttachment | null;
  position: number;
  updated_at: string;
}

/** POST /saved-replies/:id/stage: the attachment copied as this sender's chat file, ready for POST /threads/:phone/file. */
export interface SavedReplyStaged {
  path: string;
  filename: string;
}

const title = z.string().trim().min(1).max(SAVED_REPLY_TITLE_MAX);
const body = z.string().trim().min(1).max(SAVED_REPLY_BODY_MAX);
/** The uploaded object (POST /saved-replies/attachment-upload-url) and the name the family sees. */
const attachment = z.object({
  path: z.string().min(1).max(300),
  name: z.string().trim().min(1).max(200).regex(/^[^/\\\p{Cc}]+$/u),
});

/** POST /saved-replies. */
export const savedReplyCreateSchema = z.object({
  scope: z.enum(SAVED_REPLY_SCOPES),
  title,
  body,
  attachment: attachment.nullable().optional(),
});
export type SavedReplyCreate = z.infer<typeof savedReplyCreateSchema>;

/** PATCH /saved-replies/:id: a missing key keeps its value; `attachment: null` removes the file. */
export const savedReplyUpdateSchema = z.object({
  title: title.optional(),
  body: body.optional(),
  attachment: attachment.nullable().optional(),
});
export type SavedReplyUpdate = z.infer<typeof savedReplyUpdateSchema>;

/** POST /saved-replies/:id/move: one place up or down within its own list. */
export const savedReplyMoveSchema = z.object({ direction: z.enum(['up', 'down']) });
export type SavedReplyMove = z.infer<typeof savedReplyMoveSchema>;

/** POST /saved-replies/attachment-upload-url: the chat's own types (JPEG, PNG, PDF); size checked against the upload limit. */
export const savedReplyUploadSchema = z.object({
  mime: z.enum(CHAT_SEND_MIMES, { message: 'file_type' }),
  size: z.int().min(1),
});
export type SavedReplyUpload = z.infer<typeof savedReplyUploadSchema>;

/** POST /saved-replies/:id/stage: the id of the file send that follows. */
export const savedReplyStageSchema = z.object({ clientRequestId: z.uuid() });

/** The 4xx codes of the saved-replies endpoints. */
export const SAVED_REPLY_ERRORS = ['saved_reply_not_found', 'saved_replies_forbidden', 'file_path', 'file_type', 'file_too_large'] as const;
export type SavedReplyError = (typeof SAVED_REPLY_ERRORS)[number];
export const isSavedReplyError = (code: unknown): code is SavedReplyError => SAVED_REPLY_ERRORS.some((c) => c === code);
