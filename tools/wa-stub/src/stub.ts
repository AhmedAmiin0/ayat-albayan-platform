// Fake Meta WhatsApp Cloud API for local dev + e2e (CLAUDE.md rule 5, docs/12 §5). Mirrors the
// Graph shapes WhatsappClient uses, including the errors that matter (132001, 132000, 131047, 190),
// Kapso's Meta proxy under /kapso (docs/19: X-API-Key, its media lookup and template edit) and the
// academy CRM's REST API under /crm/api/v1 (crm.ts).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { controlRoutes } from './control.ts';
import { CRM_PREFIX, crmRoute } from './providers/crm.ts';
import { diagnosticRoutes } from './diagnostics.ts';
import { graphRoutes } from './providers/graph.ts';
import {
  authKind,
  KAPSO_PREFIX,
  kapsoAuthorized,
  kapsoMediaDownload,
  kapsoRoutes,
} from './providers/kapso.ts';
import { kapsoCallRoutes } from './providers/kapso-calls.ts';
import { authorized, initialHealth, initialTemplates } from './lines.ts';
import { ERR, metaError } from './providers/meta.ts';
import type { Reply, Route, StubOptions, StubState } from './state.ts';
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
    calls: [],
  };
}

type Via = 'kapso' | 'graph';

interface Target {
  via: Via;
  path: string;
}

/** `/kapso/v24.0/…` → the Graph path under Kapso's prefix; else Meta's path or /__stub. */
function splitPrefix(fullPath: string): Target {
  const viaKapso = fullPath === KAPSO_PREFIX || fullPath.startsWith(`${KAPSO_PREFIX}/`);
  return viaKapso
    ? { via: 'kapso', path: fullPath.slice(KAPSO_PREFIX.length) }
    : { via: 'graph', path: fullPath };
}

/** /__stub control calls skip auth and the request log; /__stub/media/ is a Graph download. */
const isControl = (at: Target): boolean =>
  at.via === 'graph' && at.path.startsWith('/__stub/') && !at.path.startsWith('/__stub/media/');

type Refusal = (req: IncomingMessage, s: StubState, at: Target) => Reply | null;

/** The 401 a request gets, or null: X-API-Key under the prefix, the bearer on Meta's paths. */
const REFUSALS: Record<Via, Refusal> = {
  kapso: (req, s) =>
    kapsoAuthorized(req, s.opts)
      ? null
      : [401, metaError(401, 'Unauthorized: a valid X-API-Key is required')],
  graph: (req, s, at) => (isControl(at) || authorized(req, s.opts) ? null : [401, ERR.auth()]),
};

/** Builds the request handler plus the inspectable state (sent log, templates, media). */
export function createStub(opts: StubOptions = {}) {
  const state = initialState(opts);
  const tables: Record<Via, Route[]> = {
    graph: [
      ...controlRoutes,
      kapsoMediaDownload,
      ...uploadRoutes,
      ...diagnosticRoutes,
      ...graphRoutes,
    ],
    kapso: [...diagnosticRoutes, ...kapsoRoutes, ...kapsoCallRoutes],
  };

  function graphRoute(req: IncomingMessage, at: Target): Reply | Promise<Reply> | null {
    const method = req.method ?? 'GET';
    const found = tables[at.via].find(([m, re]) => m === method && re.test(at.path));
    if (!found) return null;
    if (!isControl(at))
      state.requests.push({ via: at.via, method, path: at.path, auth: authKind(req) });
    const refused = REFUSALS[at.via](req, state, at);
    return refused ?? found[2](req, found[1].exec(at.path) as RegExpExecArray, state);
  }

  async function route(req: IncomingMessage, fullPath: string): Promise<Reply | null> {
    return fullPath.startsWith(`${CRM_PREFIX}/`)
      ? crmRoute(req, fullPath.slice(CRM_PREFIX.length), state)
      : graphRoute(req, splitPrefix(fullPath));
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? '/', 'http://stub').pathname;
    const reply = await route(req, path);
    if (!reply)
      return void res
        .writeHead(404)
        .end(JSON.stringify({ error: `no stub route for ${req.method ?? 'GET'} ${path}` }));
    if (Array.isArray(reply))
      return void res
        .writeHead(reply[0], { 'content-type': 'application/json' })
        .end(JSON.stringify(reply[1]));
    res.writeHead(reply.status, { 'content-type': reply.mime }).end(reply.bytes);
  }

  return { handle, state, sent: state.sent };
}
