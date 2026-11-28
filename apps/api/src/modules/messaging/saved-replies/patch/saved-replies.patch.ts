import type { SavedReplyUpdate } from '@ab/shared';
import { sameStoredObject } from '@ab/shared';
import type { StoredFile } from '@/modules/messaging/saved-replies/saved-replies.files';
import type { ReplyPatch } from '@/modules/messaging/saved-replies/saved-replies.repo';

const NO_ATTACHMENT = {
  attachment_path: null,
  attachment_mime: null,
  attachment_size: null,
  attachment_name: null,
} as const;

/** The attachment columns for a stored file and its name, or all null. */
export const attachmentColumns = (file: StoredFile | null, name: string | null) =>
  file === null
    ? NO_ATTACHMENT
    : {
        attachment_path: file.path,
        attachment_mime: file.mime,
        attachment_size: file.size,
        attachment_name: name,
      };

/** Only the text fields the client sent. */
export const textPatch = (input: SavedReplyUpdate): Pick<ReplyPatch, 'title' | 'body'> => ({
  ...(input.title === undefined ? {} : { title: input.title }),
  ...(input.body === undefined ? {} : { body: input.body }),
});

/** A path sent back for the reply's own moved file (docs/45 §6) is no replacement. */
export function replacesFile(
  attachment: SavedReplyUpdate['attachment'],
  oldPath: string | null,
): boolean {
  if (attachment === undefined) return false;
  const sentPath = attachment?.path;
  return sentPath !== oldPath && !sameStoredObject(sentPath, oldPath);
}
