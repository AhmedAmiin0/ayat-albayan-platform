// Kapso's Meta proxy (docs/19): the same Graph routes under /kapso/{version}/…, authenticated by
// X-API-Key (a Bearer or OAuth header is refused), with Kapso's own media lookup and template edit.
import type { IncomingMessage } from 'node:http';
import { phoneInfo } from '../diagnostics.ts';
import { createTemplateRoute, listTemplatesRoute, messagesRoute, V } from './graph.ts';
import { ERR, metaError } from './meta.ts';
import { readJson, type Route, type StubOptions } from '../state.ts';
import { createTemplate, editTemplate } from '../templates.ts';

export const KAPSO_PREFIX = '/kapso';
export type AuthKind = 'api-key' | 'bearer' | 'oauth' | 'none';

/** Which credential a request carried; an authorization header wins (it is what a mix-up would send). */
export function authKind(req: IncomingMessage): AuthKind {
  const auth = req.headers.authorization ?? '';
  if (/^Bearer /.test(auth)) return 'bearer';
  if (/^OAuth /.test(auth)) return 'oauth';
  return typeof req.headers['x-api-key'] === 'string' ? 'api-key' : 'none';
}

/** X-API-Key only, never with an authorization header; equal to the configured key when one is set. */
export function kapsoAuthorized(req: IncomingMessage, opts: StubOptions): boolean {
  if (authKind(req) !== 'api-key') return false;
  const want = opts.kapso?.apiKey;
  return !want || req.headers['x-api-key'] === want;
}

const query = (req: IncomingMessage) => new URL(req.url ?? '/', 'http://stub').searchParams;

/** POST /{waba}/message_templates?hsm_id=<id> edits that template; without hsm_id it creates. */
const kapsoTemplatesRoute: Route = [createTemplateRoute[0], createTemplateRoute[1], async (req, m, s) => {
  const hsm = query(req).get('hsm_id');
  return hsm ? editTemplate(s, hsm, await readJson(req)) : createTemplate(s, { body: await readJson(req), wabaId: m[1] ?? '' });
}];

/** GET /{media id} needs phone_number_id; answers Meta's lookaside `url` (unusable) AND a `download_url`. */
const kapsoMediaRoute: Route = ['GET', new RegExp(`^${V}/([^/]+)$`), async (req, m, s) => {
  const id = m[1] ?? '';
  const phone = phoneInfo(req, s, id);
  if (phone) return phone;
  if (!query(req).get('phone_number_id')) return [400, metaError(100, 'Invalid parameter', 'phone_number_id is required')];
  const media = s.media.get(id);
  if (!media) return [404, ERR.noMedia(id)];
  const download_url = `http://${req.headers.host ?? 'localhost'}/__stub/kapso-media/${id}?token=stub-signed`;
  const url = `https://lookaside.stub.invalid/whatsapp_business/attachments/?mid=${id}`;
  return [200, { messaging_product: 'whatsapp', url, download_url, mime_type: media.mime, sha256: 'stub', file_size: media.bytes.length, id }];
}];

/** No /{template id} edit and no resumable upload on Kapso: those paths are 404 under the prefix. */
export const kapsoRoutes: Route[] = [messagesRoute, listTemplatesRoute, kapsoTemplatesRoute, kapsoMediaRoute];

/** GET /__stub/kapso-media/{id}: the bytes, only WITHOUT any credential (the token is in the URL). */
export const kapsoMediaDownload: Route = ['GET', /^\/__stub\/kapso-media\/([a-f0-9]+)$/, async (req, m, s) => {
  if (authKind(req) !== 'none') return [400, { error: 'download_url must be fetched without credentials' }];
  const media = s.media.get(m[1] ?? '');
  return media ? { status: 200, mime: media.mime, bytes: media.bytes } : [404, { error: 'no media' }];
}];
