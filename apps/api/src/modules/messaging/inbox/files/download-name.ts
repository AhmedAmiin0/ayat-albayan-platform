import { baseMime } from '@ab/shared';
import { extFor } from '../../../../common/storage/storage.paths';

/** The columns a saved file is named from. */
interface NamedFile {
  /** A file staff sent keeps the name the family saw (thread-file-send). */
  media_name?: string | null;
  media_mime: string | null;
  created_at: string;
}

/**
 * The name «تنزيل» saves a bubble's file under (owner 2026-10-26): a sent file's own name, else
 * «whatsapp-2026-10-26-1432.jpg» from the message's UTC time and type (WhatsApp sends no name for a photo).
 */
export function downloadName(file: NamedFile): string {
  const own = file.media_name?.trim();
  if (own) return own;
  const stamp = new Date(file.created_at).toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  return `whatsapp-${stamp}.${extFor(baseMime(file.media_mime))}`;
}
