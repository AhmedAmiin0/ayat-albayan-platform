// The academy CRM's public REST API (docs/19 «crm driver»), minimal: GET /me and POST /messages under
// /crm/api/v1, Bearer key, the CRM's {data} / {error:{code,message}} envelope. Enough for the api tests and
// e2e to drive a crm line; never the real CRM.
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { readJson, type Reply, type StubState } from './state.ts';

export const CRM_PREFIX = '/crm/api/v1';

const fail = (status: number, code: string, message: string): Reply => [status, { error: { code, message } }];

/** A Bearer equal to opts.crm.apiKey when one is set (else any bearer); never an X-API-Key. */
function crmAuthorized(req: IncomingMessage, s: StubState): boolean {
  const auth = req.headers.authorization ?? '';
  if (!/^Bearer \S+$/.test(auth)) return false;
  const want = s.opts.crm?.apiKey;
  return !want || auth === `Bearer ${want}`;
}

/** POST /messages: a template needs a name and language, text needs text, media a media_url; E.164 `to`. */
async function postMessage(req: IncomingMessage, s: StubState): Promise<Reply> {
  const body = (await readJson(req)) as Record<string, unknown>;
  const to = typeof body['to'] === 'string' ? body['to'] : '';
  if (!/^\+[1-9]\d{6,14}$/.test(to)) return fail(400, 'bad_request', "'to' must be E.164");
  const type = typeof body['type'] === 'string' ? body['type'] : 'text';
  const tpl = body['template'] as { name?: unknown; language?: unknown } | undefined;
  if (type === 'template' && (typeof tpl?.name !== 'string' || typeof tpl.language !== 'string')) return fail(400, 'bad_request', 'template name and language are required');
  if (type !== 'template' && type !== 'text' && typeof body['media_url'] !== 'string') return fail(400, 'bad_request', 'media_url is required');
  const id = `wamid.${randomUUID()}`;
  s.sent.push({ id, to: to.slice(1), type, ...(type === 'template' ? { template: String(tpl?.name) } : {}), body, via: 'crm' });
  return [201, { data: { message_id: randomUUID(), whatsapp_message_id: id, conversation_id: randomUUID(), contact_id: randomUUID(), contact_created: false } }];
}

/** A request under CRM_PREFIX (path without it), or null for an unknown route. */
export async function crmRoute(req: IncomingMessage, path: string, s: StubState): Promise<Reply | null> {
  const method = req.method ?? 'GET';
  const known = (method === 'GET' && path === '/me') || (method === 'POST' && path === '/messages');
  if (!known) return null;
  s.requests.push({ via: 'crm', method, path, auth: /^Bearer /.test(req.headers.authorization ?? '') ? 'bearer' : 'none' });
  if (!crmAuthorized(req, s)) return fail(401, 'unauthorized', 'Missing or invalid API key');
  const scopes = s.opts.crm?.scopes ?? ['messages:send'];
  if (path === '/me') return [200, { data: { account: { id: 'acct-stub', name: 'Stub academy' }, key: { id: 'key-stub', scopes } } }];
  if (!scopes.includes('messages:send')) return fail(403, 'forbidden', "This API key is missing the 'messages:send' scope");
  return postMessage(req, s);
}
