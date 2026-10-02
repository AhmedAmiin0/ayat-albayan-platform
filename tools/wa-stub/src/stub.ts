// Fake Meta WhatsApp Cloud API for local dev + e2e (CLAUDE.md rule 5, docs/12 §5). Mirrors the
// Graph shapes WhatsappClient uses, including the errors that matter (132001, 132000, 131047, 190).
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { controlRoutes } from './control.ts';
import { bodyParamCount, defaultTemplates, ERR, templateJson, type Json, type StubTemplate } from './meta.ts';
import { DAY_MS, digits, readJson, type Reply, type Route, type StubOptions, type StubState } from './state.ts';

export type { SentMessage, StubOptions } from './state.ts';

function templateError(s: StubState, body: Json): Json | null {
  const t = (body['template'] ?? {}) as { name?: string; language?: { code?: string }; components?: Json[] };
  const lang = t.language?.code ?? 'ar';
  const found = s.templates.find((x) => x.name === t.name && x.language === lang);
  if (!found || ['PENDING', 'REJECTED', 'DISABLED'].includes(found.status)) return ERR.noTemplate(t.name ?? '', lang);
  if (found.status === 'PAUSED') return ERR.paused(found.name);
  const bodyPart = t.components?.find((c) => c['type'] === 'body');
  const got = Array.isArray(bodyPart?.['parameters']) ? bodyPart['parameters'].length : 0;
  const want = bodyParamCount(found);
  return got === want ? null : ERR.params(want, got);
}

function postMessage(s: StubState, body: Json): Reply {
  if (body['status'] === 'read') {
    s.reads.push(String(body['message_id'] ?? ''));
    return [200, { success: true }];
  }
  const to = digits(body['to']);
  const type = String(body['type'] ?? 'text');
  const injected = s.failNext.get(to);
  if (injected) {
    s.failNext.delete(to);
    return [400, injected];
  }
  if (type === 'template') {
    const err = templateError(s, body);
    if (err) return [404, err];
  } else if (s.opts.enforceWindow !== false && Date.now() - (s.lastInbound.get(to) ?? 0) >= DAY_MS) {
    return [400, ERR.window()];
  }
  const id = `wamid.${randomUUID()}`;
  const template = (body['template'] as { name?: string } | undefined)?.name;
  s.sent.push({ id, to, type, ...(template ? { template } : {}), body });
  return [200, { messaging_product: 'whatsapp', contacts: [{ input: to, wa_id: to }], messages: [{ id }] }];
}

function createTemplate(s: StubState, body: Json): Reply {
  const name = String(body['name'] ?? '');
  const language = String(body['language'] ?? 'ar');
  if (!/^[a-z0-9_]{1,512}$/.test(name)) return [400, ERR.badName(name)];
  if (s.templates.some((t) => t.name === name && t.language === language)) return [400, ERR.duplicate(name)];
  const category = String(body['category'] ?? 'UTILITY').toUpperCase();
  const components = Array.isArray(body['components']) ? (body['components'] as Json[]) : [];
  const t: StubTemplate = { id: randomUUID(), name, language, category, status: 'PENDING', quality: 'UNKNOWN', components };
  s.templates.push(t);
  return [200, { id: t.id, status: t.status, category }];
}

const V = String.raw`\/v\d+\.\d+`;
const graphRoutes: Route[] = [
  ['POST', new RegExp(`^${V}/[^/]+/messages$`), async (req, _m, s) => postMessage(s, await readJson(req))],
  ['GET', new RegExp(`^${V}/[^/]+/message_templates$`), async (req, _m, s) => {
    const name = new URL(req.url ?? '/', 'http://stub').searchParams.get('name');
    const data = s.templates.filter((t) => !name || t.name === name).map(templateJson);
    return [200, { data, paging: { cursors: { before: 'stub', after: 'stub' } } }];
  }],
  ['POST', new RegExp(`^${V}/[^/]+/message_templates$`), async (req, _m, s) => createTemplate(s, await readJson(req))],
  ['GET', new RegExp(`^${V}/([^/]+)$`), async (req, m, s) => {
    const id = m[1] ?? '';
    const media = s.media.get(id);
    if (!media) return [404, ERR.noMedia(id)];
    const url = `http://${req.headers.host ?? 'localhost'}/__stub/media/${id}`;
    return [200, { messaging_product: 'whatsapp', url, mime_type: media.mime, sha256: 'stub', file_size: media.bytes.length, id }];
  }],
];

function authorized(req: IncomingMessage, s: StubState): boolean {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ') || auth.length <= 7) return false;
  return !s.opts.accessToken || auth === `Bearer ${s.opts.accessToken}`;
}

/** Builds the request handler plus the inspectable state (sent log, templates, media). */
export function createStub(opts: StubOptions = {}) {
  const state: StubState = {
    opts,
    templates: opts.templates ?? defaultTemplates(),
    sent: [],
    reads: [],
    media: new Map(),
    lastInbound: new Map(),
    failNext: new Map(),
  };
  const routes = [...controlRoutes, ...graphRoutes];

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? '/', 'http://stub').pathname;
    const method = req.method ?? 'GET';
    const route = routes.find(([m, re]) => m === method && re.test(path));
    if (!route) return void res.writeHead(404).end(JSON.stringify({ error: `no stub route for ${method} ${path}` }));
    const isControl = path.startsWith('/__stub/') && !path.startsWith('/__stub/media/');
    const reply: Reply = isControl || authorized(req, state) ? await route[2](req, route[1].exec(path) as RegExpExecArray, state) : [401, ERR.auth()];
    if (Array.isArray(reply)) return void res.writeHead(reply[0], { 'content-type': 'application/json' }).end(JSON.stringify(reply[1]));
    res.writeHead(reply.status, { 'content-type': reply.mime }).end(reply.bytes);
  }

  return { handle, state, sent: state.sent };
}
