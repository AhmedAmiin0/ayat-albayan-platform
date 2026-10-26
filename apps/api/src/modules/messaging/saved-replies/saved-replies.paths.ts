import { randomUUID } from 'node:crypto';
import { extFor } from '../../../common/storage/storage.paths';

// A saved reply's attachment lives in the chat's own bucket (wa-media) under saved/{actor}/: the
// person who uploaded it. Sending it copies it to out/{sender}/{request}/ (chatOutPath), so the chat's
// existing file send checks it exactly like a file picked from the device.

/** wa-media/saved/{actor}/{uuid}.{ext}: one object per upload, never overwritten. */
export function savedReplyPath(input: { actorId: string; mime: string }): string {
  return `saved/${input.actorId}/${randomUUID()}.${extFor(input.mime)}`;
}

/** Was `path` signed for this actor? Exactly saved/{actor}/{file}, no traversal. */
export function isSavedReplyPathOf(path: string, actorId: string): boolean {
  const parts = path.split('/');
  const [saved, actor, file] = parts;
  return parts.length === 3 && saved === 'saved' && actor === actorId
    && file !== undefined && file.length > 0 && file !== '..' && file !== '.';
}
