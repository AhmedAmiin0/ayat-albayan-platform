// Fake Meta WhatsApp Cloud API for local dev + e2e (CLAUDE.md rule 5, docs/12 §5). Mirrors the
// Graph shapes WhatsappClient uses, including the errors that matter (132001, 132000, 131047, 190),
// and Kapso's Meta proxy under /kapso (docs/19: X-API-Key, its media lookup and template edit).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { controlRoutes } from './control.ts';
import { diagnosticRoutes } from './diagnostics.ts';
import { graphRoutes } from './graph.ts';
import { authKind, KAPSO_PREFIX, kapsoAuthorized, kapsoMediaDownload, kapsoRoutes } from './kapso.ts';
import { authorized, initialHealth } from './lines.ts';
import { ERR, metaError } from './meta.ts';
import type { Reply, StubOptions, StubState } from './state.ts';
import { initialTemplates } from './templates.ts';
import { uploadRoutes } from './uploads.ts';

export type { SentMessage, StubOptions } from './state.ts';

function initialState(opts: StubOptions): StubState {
  return {
    opts,
    templates: initialTemplates(opts),
    sent: [],
    reads: [],
    readLog: [],
    health: initialHealth(opts),
    media: new Map(),
    lastInbound: new Map(),
    failNext: new Map(),
    uploads: new Map(),
    handles: new Set(),
    requests: [],
  };
}

/** `/kapso/v24.0/…` → the Graph path under Kapso's prefix; anything else is Meta's path or /__stub. */
function splitPrefix(fullPath: string): { viaKapso: boolean; path: string } {
  const viaKapso = fullPath === KAPSO_PREFIX || fullPath.startsWith(`${KAPSO_PREFIX}/`);
  return { viaKapso, path: viaKapso ? fullPath.slice(KAPSO_PREFIX.length) : fullPath };
}

/** The 401 a request gets, or null: X-API-Key under the prefix, the bearer on Meta's paths. */
function refusal(req: IncomingMessage, s: StubState, at: { viaKapso: boolean; isControl: boolean }): Reply | null {
  if (at.viaKapso) return kapsoAuthorized(req, s.opts) ? null : [401, metaError(401, 'Unauthorized: a valid X-API-Key is required')];
  return at.isControl || authorized(req, s.opts) ? null : [401, ERR.auth()];
}

/** Builds the request handler plus the inspectable state (sent log, templates, media). */
export function createStub(opts: StubOptions = {}) {
  const state = initialState(opts);
  const routes = [...controlRoutes, kapsoMediaDownload, ...uploadRoutes, ...diagnosticRoutes, ...graphRoutes];
  const kapso = [...diagnosticRoutes, ...kapsoRoutes];

  async function route(req: IncomingMessage, fullPath: string): Promise<Reply | null> {
    const { viaKapso, path } = splitPrefix(fullPath);
    const method = req.method ?? 'GET';
    const found = (viaKapso ? kapso : routes).find(([m, re]) => m === method && re.test(path));
    if (!found) return null;
    const isControl = !viaKapso && path.startsWith('/__stub/') && !path.startsWith('/__stub/media/');
    if (!isControl) state.requests.push({ via: viaKapso ? 'kapso' : 'graph', method, path, auth: authKind(req) });
    const refused = refusal(req, state, { viaKapso, isControl });
    if (refused) return refused;
    return found[2](req, found[1].exec(path) as RegExpExecArray, state);
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? '/', 'http://stub').pathname;
    const reply = await route(req, path);
    if (!reply) return void res.writeHead(404).end(JSON.stringify({ error: `no stub route for ${req.method ?? 'GET'} ${path}` }));
    if (Array.isArray(reply)) return void res.writeHead(reply[0], { 'content-type': 'application/json' }).end(JSON.stringify(reply[1]));
    res.writeHead(reply.status, { 'content-type': reply.mime }).end(reply.bytes);
  }

  return { handle, state, sent: state.sent };
}
