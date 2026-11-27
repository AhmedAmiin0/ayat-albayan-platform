import { clientRequestId, partialOf } from '@ab/core';
import { z } from 'zod';
import { CHAT_SEND_MIMES } from '../../chat/chat-files';
import {
  SAVED_REPLY_BODY_MAX,
  SAVED_REPLY_ERRORS,
  SAVED_REPLY_MOVES,
  SAVED_REPLY_SCOPES,
  SAVED_REPLY_TITLE_MAX,
} from './saved-replies';

export const savedReplyScopeSchema = z.enum(SAVED_REPLY_SCOPES);
export type SavedReplyScope = z.infer<typeof savedReplyScopeSchema>;

export const savedReplyErrorSchema = z.enum(SAVED_REPLY_ERRORS);
export type SavedReplyError = z.infer<typeof savedReplyErrorSchema>;

/** The chat's own send types (JPEG, PNG, PDF); anything else is 400 file_type. */
export const savedReplyMimeSchema = z.enum(CHAT_SEND_MIMES, { message: 'file_type' });

/** A reply's optional image or PDF, sent after its text through the chat's own file send. */
export const savedReplyAttachmentSchema = z.object({
  name: z.string(),
  mime: savedReplyMimeSchema,
  size: z.number(),
});
export type SavedReplyAttachment = z.infer<typeof savedReplyAttachmentSchema>;

/** GET /saved-replies: the shared list, then the caller's own, each by position then title. */
export const savedReplySchema = z.object({
  id: z.string(),
  scope: savedReplyScopeSchema,
  title: z.string(),
  body: z.string(),
  attachment: savedReplyAttachmentSchema.nullable(),
  position: z.number(),
  updated_at: z.string(),
});
export type SavedReply = z.infer<typeof savedReplySchema>;

/** The attachment copied as this sender's chat file, ready for POST /threads/:phone/file. */
export const savedReplyStagedSchema = z.object({ path: z.string(), filename: z.string() });
export type SavedReplyStaged = z.infer<typeof savedReplyStagedSchema>;

const title = z.string().trim().min(1).max(SAVED_REPLY_TITLE_MAX);
const body = z.string().trim().min(1).max(SAVED_REPLY_BODY_MAX);
/** The uploaded object (POST /saved-replies/attachment-upload-url) and the name the family sees. */
const attachment = z.object({
  path: z.string().min(1).max(300),
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[^/\\\p{Cc}]+$/u),
});

export const savedReplyCreateSchema = z.object({
  scope: savedReplyScopeSchema,
  title,
  body,
  attachment: attachment.nullable().optional(),
});
export type SavedReplyCreate = z.infer<typeof savedReplyCreateSchema>;

/** A missing key keeps its value; `attachment: null` removes the file. */
export const savedReplyUpdateSchema = partialOf(savedReplyCreateSchema.omit({ scope: true }));
export type SavedReplyUpdate = z.infer<typeof savedReplyUpdateSchema>;

export const savedReplyMoveSchema = z.object({ direction: z.enum(SAVED_REPLY_MOVES) });
export type SavedReplyMove = z.infer<typeof savedReplyMoveSchema>;

/** The size is checked against the upload limit. */
export const savedReplyUploadSchema = z.object({
  mime: savedReplyMimeSchema,
  size: z.int().min(1),
});
export type SavedReplyUpload = z.infer<typeof savedReplyUploadSchema>;

/** The id of the file send that follows. */
export const savedReplyStageSchema = z.object({ clientRequestId });
export type SavedReplyStage = z.input<typeof savedReplyStageSchema>;

/** A `:id` that is not a uuid cannot name a reply (the api answers 404 saved_reply_not_found). */
export const savedReplyIdParam = z.uuid();
export const savedReplyParamsSchema = z.object({ id: savedReplyIdParam });
