import { isChatViewMime } from '@ab/shared';
import { isSentFilePath } from '@/common/storage/storage.paths';
import { isCrmHistoryRow } from './crm-history/crm-history-url';
import { mediaExpired } from './inbound-media/inbound-media.service';
import type { ThreadMessageRow } from './message.mapper';

/**
 * A file we can still fetch from WhatsApp (theirs, or an echo of the WhatsApp Business app): a
 * bubble type, not expired.
 */
const fetchable = (row: ThreadMessageRow): boolean =>
  isChatViewMime(row.media_mime) && !mediaExpired(row, new Date());

const isText = (row: ThreadMessageRow): boolean => !row.media_mime && !!row.body?.trim();

/** A sent row's: our stored file (out/…, either store), an echo still fetchable, or a text. */
const outboundForwardable = (row: ThreadMessageRow): boolean =>
  isSentFilePath(row.media_path) || (row.media_id ? fetchable(row) : isText(row));

const hasMedia = (row: ThreadMessageRow): boolean => Boolean(row.media_id || row.media_path);

/** Theirs: a file we can still fetch, an old-CRM file of a bubble type, or a text. */
const inboundForwardable = (row: ThreadMessageRow): boolean => {
  if (hasMedia(row)) return fetchable(row);
  return isCrmHistoryRow(row) ? isChatViewMime(row.media_mime) : !!row.body?.trim();
};

/** Never a template; a file only when we hold it or can still fetch it. */
export const isForwardable = (row: ThreadMessageRow): boolean => {
  if (row.template_key) return false;
  return row.direction === 'outbound' ? outboundForwardable(row) : inboundForwardable(row);
};
