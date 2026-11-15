import type { SavedReply, SavedReplyAttachment, SavedReplyCreate, SavedReplyScope, SavedReplyUpdate } from '@ab/shared';

// The editor's attachment: unchanged, removed, or a new upload (its storage path and what it is).

export type DraftFile =
  | { kind: 'keep'; attachment: SavedReplyAttachment }
  | { kind: 'none' }
  | { kind: 'new'; path: string; attachment: SavedReplyAttachment };

export interface ReplyDraft {
  title: string;
  body: string;
  file: DraftFile;
}

export const draftOf = (reply: SavedReply | null): ReplyDraft => ({
  title: reply?.title ?? '',
  body: reply?.body ?? '',
  file: reply?.attachment ? { kind: 'keep', attachment: reply.attachment } : { kind: 'none' },
});

/** POST body: a new file goes with its path and name; none sends nothing. */
export function createBody(draft: ReplyDraft, scope: SavedReplyScope): SavedReplyCreate {
  const body: SavedReplyCreate = { scope, title: draft.title.trim(), body: draft.body.trim() };
  return draft.file.kind === 'new' ? { ...body, attachment: { path: draft.file.path, name: draft.file.attachment.name } } : body;
}

/** PATCH body: a kept file is left out (unchanged), a removed one is null. */
export function updateBody(draft: ReplyDraft, had: boolean): SavedReplyUpdate {
  const body: SavedReplyUpdate = { title: draft.title.trim(), body: draft.body.trim() };
  if (draft.file.kind === 'new') return { ...body, attachment: { path: draft.file.path, name: draft.file.attachment.name } };
  return draft.file.kind === 'none' && had ? { ...body, attachment: null } : body;
}

/** The name the family sees: ≤ 200 characters, keeping the end (the extension), no slashes. */
export const fileName = (file: File): string => file.name.replace(/[/\\\p{Cc}]/gu, '_').trim().slice(-200) || 'file';
