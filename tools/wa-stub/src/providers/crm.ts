// The academy CRM's public REST API (docs/19 «crm driver»), minimal: GET /me and POST /messages
// under /crm/api/v1, Bearer key, the CRM's {data} / {error:{code,message}} envelope. Enough for the
// api tests and
// e2e to drive a crm line; never the real CRM.
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Json } from './meta.ts';
import { readJson, type Reply, type StubState } from '../state.ts';

export const CRM_PREFIX = '/crm/api/v1';

const fail = (status: number, code: string, message: string): Reply => [
  status,
  { error: { code, message } },
];

/** A Bearer equal to opts.crm.apiKey when one is set (else any bearer); never an X-API-Key. */
function crmAuthorized(req: IncomingMessage, s: StubState): boolean {
  const auth = req.headers.authorization ?? '';
  if (!/^Bearer \S+$/.test(auth)) return false;
  const want = s.opts.crm?.apiKey;
  return !want || auth === `Bearer ${want}`;
}

const E164 = /^\+[1-9]\d{6,14}$/;

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const templateOf = (body: Json) =>
  body.template as { name?: unknown; language?: unknown } | undefined;

function namesTemplate(body: Json): boolean {
  const tpl = templateOf(body);
  return typeof tpl?.name === 'string' && typeof tpl.language === 'string';
}

type Check = (body: Json) => string | null;

const needsMediaUrl: Check = (body) =>
  typeof body.media_url === 'string' ? null : 'media_url is required';

/** What each message type needs; any type not listed is media. */
const NEEDS = new Map<string, Check>([
  ['template', (body) => (namesTemplate(body) ? null : 'template name and language are required')],
  ['text', () => null],
]);

function bodyProblem(body: Json, to: string, type: string): string | null {
  if (!E164.test(to)) return "'to' must be E.164";
  return (NEEDS.get(type) ?? needsMediaUrl)(body);
}

const templateField = (type: string, body: Json) =>
  type === 'template' ? { template: String(templateOf(body)?.name) } : {};

const accepted = (id: string) => ({
  data: {
    message_id: randomUUID(),
    whatsapp_message_id: id,
    conversation_id: randomUUID(),
    contact_id: randomUUID(),
    contact_created: false,
  },
});

/**
 * POST /messages: a template needs name and language, text needs text, media a media_url; E.164
 * `to`.
 */
async function postMessage(req: IncomingMessage, s: StubState): Promise<Reply> {
  const body = (await readJson(req)) as Record<string, unknown>;
  const to = text(body.to, '');
  const type = text(body.type, 'text');
  const problem = bodyProblem(body, to, type);
  if (problem) return fail(400, 'bad_request', problem);
  const id = `wamid.${randomUUID()}`;
  s.sent.push({ id, to: to.slice(1), type, ...templateField(type, body), body, via: 'crm' });
  return [201, accepted(id)];
}

const scopesOf = (s: StubState): string[] => s.opts.crm?.scopes ?? ['messages:send'];

type Handler = (req: IncomingMessage, s: StubState) => Reply | Promise<Reply>;

const ROUTES = new Map<string, Handler>([
  [
    'GET /me',
    (_req, s) => [
      200,
      {
        data: {
          account: { id: 'acct-stub', name: 'Stub academy' },
          key: { id: 'key-stub', scopes: scopesOf(s) },
        },
      },
    ],
  ],
  [
    'POST /messages',
    (req, s) =>
      scopesOf(s).includes('messages:send')
        ? postMessage(req, s)
        : fail(403, 'forbidden', "This API key is missing the 'messages:send' scope"),
  ],
]);

const authKindOf = (req: IncomingMessage) =>
  (req.headers.authorization ?? '').startsWith('Bearer ') ? 'bearer' : 'none';

/** A request under CRM_PREFIX (path without it), or null for an unknown route. */
export function crmRoute(
  req: IncomingMessage,
  path: string,
  s: StubState,
): Reply | Promise<Reply> | null {
  const method = req.method ?? 'GET';
  const handler = ROUTES.get(`${method} ${path}`);
  if (!handler) return null;
  s.requests.push({ via: 'crm', method, path, auth: authKindOf(req) });
  return crmAuthorized(req, s)
    ? handler(req, s)
    : fail(401, 'unauthorized', 'Missing or invalid API key');
}
