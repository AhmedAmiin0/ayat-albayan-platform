import type { TemplateDocument } from '@ab/shared';
import { BUCKETS, isSentFilePath, SIGNED_URL_SECONDS } from '@/common/storage/storage.paths';
import type { StorageService } from '@/common/storage/storage.service';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

const seconds = SIGNED_URL_SECONDS.whatsapp;

/**
 * A 7-day signed link to a report PDF (R-REP-03): WhatsApp fetches it after the send and the
 * guardian may open the wa.me fallback later. Only the reports bucket is ever signed here.
 */
export async function documentLink(
  storage: StorageService,
  doc: TemplateDocument | undefined,
): Promise<string | null> {
  if (!doc) return null;
  if (doc.bucket !== BUCKETS.reports) {
    const info = { code: 100, status: 0 };
    throw new WaError(`document bucket ${doc.bucket} is not the reports bucket`, info);
  }
  const signed = await storage.signedDownload({ bucket: BUCKETS.reports, path: doc.path, seconds });
  return signed.url;
}

/**
 * A 7-day signed link to a file staff sent from the chat, signed again on every try. Only
 * wa-media paths under out/ are ever signed: never an inbound cache, never a report.
 */
export async function mediaLink(storage: StorageService, path: string): Promise<string> {
  if (!isSentFilePath(path)) {
    throw new WaError(`media path ${path} is not a sent file`, { code: 100, status: 0 });
  }
  const signed = await storage.signedDownload({ bucket: BUCKETS.waMedia, path, seconds });
  return signed.url;
}
