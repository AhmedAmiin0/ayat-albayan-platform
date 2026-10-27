import type { MediaMessage } from '../inbound-media.queries';

/** Where the old CRM kept a chat's files: its own storage's public chat-media bucket. */
export const CRM_MEDIA_PREFIX = '/storage/v1/object/public/chat-media/';

/** The columns that tell an imported CRM file (a messages row, or a v_threads last message). */
type CrmHistoryShape = { direction: string | null; media_mime: string | null; body: string | null };

/**
 * The body as an old-CRM file link, or null: the whole (trimmed) body is ONE https URL in canonical
 * form (no space, userinfo, port, query or fragment; no «..» or encoded slash) under CRM_MEDIA_PREFIX.
 * Only the shape: the host is checked against the setting by allowedCrmUrl before any fetch.
 */
export function crmMediaUrl(body: string | null): URL | null {
  const text = body?.trim() ?? '';
  if (!text.startsWith('https://') || /[\s\\]|%2e|%2f|%5c/i.test(text)) return null;
  const url = parsed(text);
  return url && url.href === text && bare(url) && underPrefix(url.pathname) ? url : null;
}

const parsed = (text: string): URL | null => {
  try {
    return new URL(text);
  } catch {
    return null;
  }
};

/** No userinfo, port, query or fragment. */
const bare = (url: URL): boolean => !(url.username || url.password || url.port || url.search || url.hash);

/** A file under CRM_MEDIA_PREFIX (not the prefix itself, not a folder). */
const underPrefix = (path: string): boolean => {
  const rest = path.slice(CRM_MEDIA_PREFIX.length);
  return path.startsWith(CRM_MEDIA_PREFIX) && rest !== '' && !rest.endsWith('/');
};

/** A family's file imported from the old CRM: inbound, a mime, and a body that is only its link. */
export const looksCrmHistory = (row: CrmHistoryShape): boolean =>
  row.direction === 'inbound' && !!row.media_mime && crmMediaUrl(row.body) !== null;

/**
 * As looksCrmHistory, on a row with no Meta media id. Still true once cached (media_path set): the
 * body stays the link (stored rows are never edited), so it is never shown as text.
 */
export const isCrmHistoryRow = (row: CrmHistoryShape & Pick<MediaMessage, 'media_id'>): boolean =>
  !row.media_id && looksCrmHistory(row);

/** A public DNS name: dotted labels ending in letters (never an IP literal, localhost or a bare name). */
const DNS_HOST = /^(?=.{4,100}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * The link we may fetch: crmMediaUrl's, on exactly the configured host (no suffix or sub-domain
 * match; case-insensitive). An empty setting, or one that is not a DNS name, allows nothing.
 */
export function allowedCrmUrl(body: string | null, host: string): URL | null {
  const want = host.trim().toLowerCase();
  const url = crmMediaUrl(body);
  return DNS_HOST.test(want) && url && url.hostname === want ? url : null;
}
