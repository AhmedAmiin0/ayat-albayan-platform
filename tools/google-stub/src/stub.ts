// Fake Google for local dev + e2e (docs/24 §5): the API's GoogleHttpClient talks to this through
// GOOGLE_API_BASE; no test or CI job ever reaches Google. /__stub/* inspects and resets it.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { calendarRoutes } from './calendar.ts';
import { driveRoutes } from './drive.ts';
import { oauthRoutes } from './oauth.ts';
import { sheetRoutes } from './sheets.ts';
import { initialState, readJson, type Reply, type Route, type StubState } from './state.ts';

function controlRoutes(state: { s: StubState }): Route[] {
  return [
    ['GET', /^\/__stub\/health$/, async () => [200, { ok: true }]],
    ['GET', /^\/__stub\/state$/, async (_r, { s }) => [200, {
      calendars: Object.fromEntries([...s.events].map(([id, evs]) => [id, [...evs.values()]])),
      files: [...s.files.values()],
      sheets: Object.fromEntries(s.sheets),
      requests: s.requests,
    }]],
    ['POST', /^\/__stub\/reset$/, async () => {
      state.s = initialState();
      return [200, { ok: true }];
    }],
    /** Make the next refresh of this token fail with invalid_grant. */
    ['POST', /^\/__stub\/revoke$/, async (req, { s }) => {
      const { token } = await readJson<{ token?: string }>(req);
      s.revoked.add(token ?? 'stub-refresh-token');
      return [200, { ok: true }];
    }],
  ];
}

const bearer = (req: IncomingMessage) => /^Bearer\s+\S+/.test(req.headers.authorization ?? '');
const OPEN = /^\/(o\/oauth2|token|revoke|__stub)/;

export function createStub() {
  const holder = { s: initialState() };
  const routes = [...controlRoutes(holder), ...oauthRoutes, ...calendarRoutes, ...driveRoutes, ...sheetRoutes];

  async function route(req: IncomingMessage, url: URL): Promise<Reply> {
    const method = req.method ?? 'GET';
    const found = routes.find(([m, re]) => m === method && re.test(url.pathname));
    if (!found) return [404, { error: `no stub route for ${method} ${url.pathname}` }];
    if (!url.pathname.startsWith('/__stub/')) holder.s.requests.push({ method, path: url.pathname });
    if (!OPEN.test(url.pathname) && !bearer(req)) return [401, { error: { code: 401, status: 'UNAUTHENTICATED', errors: [{ reason: 'authError' }] } }];
    return found[2](req, { m: found[1].exec(url.pathname) as RegExpExecArray, s: holder.s, url });
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const reply = await route(req, new URL(req.url ?? '/', 'http://stub'));
    if (!Array.isArray(reply)) return void res.writeHead(reply.status, { location: reply.location }).end();
    const [status, body] = reply;
    if (status === 204) return void res.writeHead(204).end();
    res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  }

  return { handle, state: () => holder.s };
}
