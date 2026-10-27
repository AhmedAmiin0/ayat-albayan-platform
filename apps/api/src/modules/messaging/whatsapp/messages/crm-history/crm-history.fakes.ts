import { vi } from 'vitest';
import type { MediaMessage } from '../inbound-media.queries';
import { CRM_MEDIA_PREFIX } from './crm-history-url';

/** Tests only: a made-up CRM storage host (reserved .example TLD); the real one is a setting, never in the repo. */
export const CRM_HOST = 'files.crm.example';

/** Tests only: an old-CRM file link on CRM_HOST (or `host`). */
export const crmLink = (name = 'inbound/1-image-1.webp', host = CRM_HOST): string =>
  `https://${host}${CRM_MEDIA_PREFIX}account-test/${name}`;

/** Tests only: an imported CRM row (no media id, no cached copy, the body is only the link). */
export const crmRow = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: 'm-crm-1',
  phone_e164: '+966552147730',
  direction: 'inbound',
  media_id: null,
  media_mime: 'image/webp',
  media_path: null,
  body: crmLink(),
  created_at: '2026-09-10T08:00:00.000Z',
  line: null,
  number: { id: 'n-crm', provider: 'crm', purpose: 'chat' },
  ...over,
});

/** Tests only: a storage answer of `size` bytes. */
export const crmResponse = (size: number, headers: Record<string, string> = { 'content-type': 'image/webp' }, status = 200): Response =>
  new Response(status === 200 ? new Uint8Array(size) : null, { status, headers });

/** Tests only: the global fetch replaced (no test reaches any real host); restore with vi.unstubAllGlobals. */
export function stubFetch(answer: () => Promise<Response>) {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => answer());
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
