import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/** What pdfinfo said about a message's PDF: its page count (0 = no preview) and its size in bytes. */
export type PdfDoc = { pages: number; bytes: number };

/**
 * messages.media_pages / media_bytes (migration 20261030000982), read and written only here: the shared
 * select of InboundMediaQueries stays without them, so a deploy that skipped the migration breaks only
 * the preview, never /file, the picker or a forward.
 */
@Injectable()
export class PdfPreviewRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** null = not probed yet. */
  async doc(id: string): Promise<PdfDoc | null> {
    const { data, error } = await this.db.from('messages').select('media_pages, media_bytes').eq('id', id).maybeSingle();
    if (error) throw new Error(`message pdf read failed: ${error.message}`);
    if (data === null || data.media_pages === null) return null;
    return { pages: data.media_pages, bytes: data.media_bytes ?? 0 };
  }

  /** The first writer wins, as setPath: pdfinfo's answer for one file never changes. */
  async setDoc(id: string, doc: PdfDoc): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({ media_pages: doc.pages, media_bytes: doc.bytes })
      .eq('id', id)
      .is('media_pages', null);
    if (error) throw new Error(`message pdf update failed: ${error.message}`);
  }
}
