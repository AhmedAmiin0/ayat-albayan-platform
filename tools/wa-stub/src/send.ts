// POST /{phone_number_id}/messages (docs/12 §5, §13.12): sends and read receipts. Every send and
// read records the phone-number id of its Graph path, so e2e can tell which line it left from.
import { randomUUID } from 'node:crypto';
import { lineOf } from './lines.ts';
import { bodyParamCount, ERR, onWaba, type Json } from './meta.ts';
import { DAY_MS, digits, type Reply, type StubState } from './state.ts';

type TemplateSend = { name?: string; language?: { code?: string }; components?: Json[] };

const bodyParams = (t: TemplateSend): number => {
  const bodyPart = t.components?.find((c) => c['type'] === 'body');
  return Array.isArray(bodyPart?.['parameters']) ? bodyPart['parameters'].length : 0;
};

/** Meta's answer to a template send from `phoneNumberId`: the template must be on that number's WABA. */
export function templateError(s: StubState, body: Json, phoneNumberId: string): Json | null {
  const t = (body['template'] ?? {}) as TemplateSend;
  const lang = t.language?.code ?? 'ar';
  const waba = lineOf(s.opts, phoneNumberId)?.wabaId;
  const found = s.templates.find((x) => x.name === t.name && x.language === lang && onWaba(x, waba));
  if (!found || ['PENDING', 'REJECTED', 'DISABLED'].includes(found.status)) return ERR.noTemplate(t.name ?? '', lang);
  if (found.status === 'PAUSED') return ERR.paused(found.name);
  const got = bodyParams(t);
  const want = bodyParamCount(found);
  return got === want ? null : ERR.params(want, got);
}

function markRead(s: StubState, body: Json, phoneNumberId: string): Reply {
  const messageId = String(body['message_id'] ?? '');
  s.reads.push(messageId);
  s.readLog.push({ phoneNumberId, messageId });
  return [200, { success: true }];
}

/** Meta's refusal of a send to `to`: an injected failure, a template error, or a closed window. */
function refusal(s: StubState, send: { body: Json; to: string; phoneNumberId: string }): Reply | null {
  const { body, to } = send;
  const injected = s.failNext.get(to);
  if (injected) {
    s.failNext.delete(to);
    return [400, injected];
  }
  if (body['type'] === 'template') {
    const err = templateError(s, body, send.phoneNumberId);
    return err ? [404, err] : null;
  }
  const windowOpen = Date.now() - (s.lastInbound.get(to) ?? 0) < DAY_MS;
  return s.opts.enforceWindow === false || windowOpen ? null : [400, ERR.window()];
}

/** `phoneNumberId` is the id in the Graph path (`/v*\/{phone_number_id}/messages`); `via` its prefix. */
export function postMessage(s: StubState, body: Json, at: { phoneNumberId: string; via: 'graph' | 'kapso' }): Reply {
  const { phoneNumberId } = at;
  if (body['status'] === 'read') return markRead(s, body, phoneNumberId);
  const to = digits(body['to']);
  const refused = refusal(s, { body, to, phoneNumberId });
  if (refused) return refused;
  const id = `wamid.${randomUUID()}`;
  const type = String(body['type'] ?? 'text');
  const template = (body['template'] as { name?: string } | undefined)?.name;
  s.sent.push({ id, to, type, ...(template ? { template } : {}), body, phoneNumberId, via: at.via });
  return [200, { messaging_product: 'whatsapp', contacts: [{ input: to, wa_id: to }], messages: [{ id }] }];
}
