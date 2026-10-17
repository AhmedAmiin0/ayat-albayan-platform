// The Graph routes WhatsappClient calls (docs/12 §5), shared by Meta's paths and the kapso prefix
// (kapso.ts), which swaps in its own media lookup and template edit.
import { phoneInfo } from './diagnostics.ts';
import { ERR, onWaba, templateJson } from './meta.ts';
import { postMessage } from './send.ts';
import { readJson, type Route } from './state.ts';
import { createTemplate, editTemplate } from './templates.ts';

export const V = String.raw`\/v\d+\.\d+`;

export const messagesRoute: Route = ['POST', new RegExp(`^${V}/([^/]+)/messages$`), async (req, m, s) => {
  const via = (req.url ?? '').startsWith('/kapso/') ? 'kapso' : 'graph';
  return postMessage(s, await readJson(req), { phoneNumberId: m[1] ?? '', via });
}];

/** Per WABA (docs/12 §13.12): the chat WABA's own starter is not on the notifications WABA. */
export const listTemplatesRoute: Route = ['GET', new RegExp(`^${V}/([^/]+)/message_templates$`), async (req, m, s) => {
  const name = new URL(req.url ?? '/', 'http://stub').searchParams.get('name');
  const data = s.templates.filter((t) => onWaba(t, m[1]) && (!name || t.name === name)).map(templateJson);
  return [200, { data, paging: { cursors: { before: 'stub', after: 'stub' } } }];
}];

export const createTemplateRoute: Route = ['POST', new RegExp(`^${V}/[^/]+/message_templates$`), async (req, _m, s) => createTemplate(s, await readJson(req))];

const metaEditRoute: Route = ['POST', new RegExp(`^${V}/([^/]+)$`), async (req, m, s) => editTemplate(s, m[1] ?? '', await readJson(req))];

const metaMediaRoute: Route = ['GET', new RegExp(`^${V}/([^/]+)$`), async (req, m, s) => {
  const id = m[1] ?? '';
  // A configured phone-number id answers its diagnostics; any other id is a media id.
  const phone = phoneInfo(req, s, id);
  if (phone) return phone;
  const media = s.media.get(id);
  if (!media) return [404, ERR.noMedia(id)];
  const url = `http://${req.headers.host ?? 'localhost'}/__stub/media/${id}`;
  return [200, { messaging_product: 'whatsapp', url, mime_type: media.mime, sha256: 'stub', file_size: media.bytes.length, id }];
}];

export const graphRoutes: Route[] = [messagesRoute, listTemplatesRoute, createTemplateRoute, metaEditRoute, metaMediaRoute];
