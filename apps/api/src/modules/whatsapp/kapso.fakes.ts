import type { KapsoLineEnv } from '../../env';
import { STUB_ENV } from './whatsapp.fakes';

// Test-only (excluded from the build). A line on Kapso's Meta proxy (docs/19) pointed at
// tools/wa-stub's kapso prefix, and the bodies Kapso answers that differ from Meta's. Ids invented.

export const KAPSO_ENV: KapsoLineEnv = {
  provider: 'kapso',
  base: 'http://127.0.0.1:4010/kapso',
  version: 'v24.0',
  phoneNumberId: STUB_ENV.phoneNumberId,
  wabaId: STUB_ENV.wabaId,
  apiKey: 'fake-kapso-key',
};

/** GET /{media id}?phone_number_id=…: Meta's lookaside `url` AND Kapso's own `download_url`. */
export const KAPSO_MEDIA = {
  url: 'https://lookaside.example.test/whatsapp_business/attachments/?mid=1',
  download_url: 'http://127.0.0.1:4010/__stub/kapso-media/m1?token=signed',
  mime_type: 'image/jpeg',
  sha256: 'stub',
  file_size: 3,
  id: 'm1',
};

/** One page of templates as Kapso lists them: cursors, never paging.next. */
export function kapsoPage(names: readonly string[], after?: string) {
  const data = names.map((name, i) => ({ id: `t-${name}-${i}`, name, language: 'ar', status: 'APPROVED', category: 'UTILITY', components: [] }));
  return { status: 200, body: { data, paging: { cursors: { before: 'b', ...(after ? { after } : {}) } } } };
}

/** A fetch that records every request and answers from the script; `bytes` replies are raw. */
export function kapsoFetch(...replies: ({ status: number; body: unknown } | { bytes: Uint8Array })[]) {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    requests.push({ url, headers: { ...(init.headers as Record<string, string>) } });
    const reply = replies.shift();
    if (!reply) throw new Error(`unscripted request ${url}`);
    if ('bytes' in reply) return new Response(new Blob([new Uint8Array(reply.bytes)]), { status: 200 });
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, requests };
}
