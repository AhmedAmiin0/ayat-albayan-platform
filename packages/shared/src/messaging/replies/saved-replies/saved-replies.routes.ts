import { defineRoute } from '@ab/core';
import { signedUploadSchema } from '../../../reports';
import {
  savedReplyCreateSchema,
  savedReplyMoveSchema,
  savedReplyParamsSchema,
  savedReplySchema,
  savedReplyStagedSchema,
  savedReplyStageSchema,
  savedReplyUpdateSchema,
  savedReplyUploadSchema,
} from './saved-replies.schemas';

const access = { permissions: ['inbox.read'], tags: ['inbox'] } as const;
const send = { permissions: ['inbox.send'], tags: ['inbox'] } as const;

/** Saved replies: a shared list and each sender's own; nothing here sends a message. */
export const savedReplyRoutes = {
  all: defineRoute({
    method: 'GET',
    path: '/saved-replies',
    response: savedReplySchema.array(),
    ...access,
  }),
  create: defineRoute({
    method: 'POST',
    path: '/saved-replies',
    body: savedReplyCreateSchema,
    response: savedReplySchema,
    ...access,
  }),
  uploadUrl: defineRoute({
    method: 'POST',
    path: '/saved-replies/attachment-upload-url',
    body: savedReplyUploadSchema,
    response: signedUploadSchema,
    ...access,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/saved-replies/:id',
    params: savedReplyParamsSchema,
    body: savedReplyUpdateSchema,
    response: savedReplySchema,
    ...access,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/saved-replies/:id',
    params: savedReplyParamsSchema,
    response: 'empty',
    ...access,
  }),
  /** One place up or down within its own list; answers both lists in their new order. */
  move: defineRoute({
    method: 'POST',
    path: '/saved-replies/:id/move',
    params: savedReplyParamsSchema,
    body: savedReplyMoveSchema,
    response: savedReplySchema.array(),
    ...access,
  }),
  /** Copies the attachment as the sender's chat file; the chat's own file send keeps every gate. */
  stage: defineRoute({
    method: 'POST',
    path: '/saved-replies/:id/stage',
    params: savedReplyParamsSchema,
    body: savedReplyStageSchema,
    response: savedReplyStagedSchema,
    ...send,
  }),
};
