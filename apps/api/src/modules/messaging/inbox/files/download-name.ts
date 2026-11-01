import { baseMime, cleanFileName, isPdfMime } from '@ab/shared';
import { extFor } from '../../../../common/storage/storage.paths';

/** The columns a saved file is named from. */
interface NamedFile {
  /** A file staff sent keeps the name the family saw (thread-file-send). */
  media_name?: string | null;
  media_mime: string | null;
  created_at: string;
}

/**
 * The file's own name, cleaned: a family's document keeps the name it was sent under (owner
 * 2026-11-01), so no control or bidi characters («‮fdp.exe»), no path, and a PDF always saved .pdf.
 */
function ownName(file: NamedFile): string {
  const own = cleanFileName(file.media_name).replace(/[/\\]/g, '_');
  const pdfWithout = own !== '' && isPdfMime(file.media_mime) && !/\.pdf$/i.test(own);
  return pdfWithout ? `${own}.pdf` : own;
}

/**
 * The name «تنزيل» saves a bubble's file under (owner 2026-10-26): a sent file's own name, else
 * «whatsapp-2026-10-26-1432.jpg» from the message's UTC time and type (WhatsApp sends no name for a photo).
 */
export function downloadName(file: NamedFile): string {
  const own = ownName(file);
  if (own) return own;
  const stamp = new Date(file.created_at).toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  return `whatsapp-${stamp}.${extFor(baseMime(file.media_mime))}`;
}
