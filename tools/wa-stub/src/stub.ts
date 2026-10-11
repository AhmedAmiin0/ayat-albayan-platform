// Fake Meta WhatsApp Cloud API for local dev + e2e (CLAUDE.md rule 5, docs/12 §5). Mirrors the
// Graph shapes WhatsappClient uses, including the errors that matter (132001, 132000, 131047, 190).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { controlRoutes } from './control.ts';
import { diagnosticRoutes, phoneInfo } from './diagnostics.ts';
import { authorized, initialHealth } from './lines.ts';
import { defaultTemplates, ERR, templateJson } from './meta.ts';
import { postMessage } from './send.ts';
import { readJson, type Reply, type Route, type StubOptions, type StubState } from './state.ts';
import { createTemplate, editTemplate } from './templates.ts';
import { uploadRoutes } from './uploads.ts';

export type { SentMessage, StubOptions } from './state.ts';

const V = String.raw`\/v\d+\.\d+`;
const graphRoutes: Route[] = [
  ['POST', new RegExp(`^${V}/([^/]+)/messages$`), async (req, m, s) => postMessage(s, await readJson(req), m[1] ?? '')],
  ['GET', new RegExp(`^${V}/[^/]+/message_templates$`), async (req, _m, s) => {
    const name = new URL(req.url ?? '/', 'http://stub').searchParams.get('name');
    const data = s.templates.filter((t) => !name || t.name === name).map(templateJson);
    return [200, { data, paging: { cursors: { before: 'stub', after: 'stub' } } }];
  }],
  ['POST', new RegExp(`^${V}/[^/]+/message_templates$`), async (req, _m, s) => createTemplate(s, await readJson(req))],
  ['POST', new RegExp(`^${V}/([^/]+)$`), async (req, m, s) => editTemplate(s, m[1] ?? '', await readJson(req))],
  ['GET', new RegExp(`^${V}/([^/]+)$`), async (req, m, s) => {
    const id = m[1] ?? '';
    // A configured phone-number id answers its diagnostics; any other id is a media id.
    const phone = phoneInfo(req, s, id);
    if (phone) return phone;
    const media = s.media.get(id);
    if (!media) return [404, ERR.noMedia(id)];
    const url = `http://${req.headers.host ?? 'localhost'}/__stub/media/${id}`;
    return [200, { messaging_product: 'whatsapp', url, mime_type: media.mime, sha256: 'stub', file_size: media.bytes.length, id }];
  }],
];

/** Builds the request handler plus the inspectable state (sent log, templates, media). */
export function createStub(opts: StubOptions = {}) {
  const state: StubState = {
    opts,
    templates: opts.templates ?? defaultTemplates(),
    sent: [],
    reads: [],
    readLog: [],
    health: initialHealth(opts),
    media: new Map(),
    lastInbound: new Map(),
    failNext: new Map(),
    uploads: new Map(),
    handles: new Set(),
  };
  const routes = [...controlRoutes, ...uploadRoutes, ...diagnosticRoutes, ...graphRoutes];

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? '/', 'http://stub').pathname;
    const method = req.method ?? 'GET';
    const route = routes.find(([m, re]) => m === method && re.test(path));
    if (!route) return void res.writeHead(404).end(JSON.stringify({ error: `no stub route for ${method} ${path}` }));
    const isControl = path.startsWith('/__stub/') && !path.startsWith('/__stub/media/');
    const reply: Reply = isControl || authorized(req, state.opts) ? await route[2](req, route[1].exec(path) as RegExpExecArray, state) : [401, ERR.auth()];
    if (Array.isArray(reply)) return void res.writeHead(reply[0], { 'content-type': 'application/json' }).end(JSON.stringify(reply[1]));
    res.writeHead(reply.status, { 'content-type': reply.mime }).end(reply.bytes);
  }

  return { handle, state, sent: state.sent };
}
