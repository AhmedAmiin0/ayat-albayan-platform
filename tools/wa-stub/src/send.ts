// POST /{phone_number_id}/messages (docs/12 §5, §13.12): sends and read receipts. Every send and
// read records the phone-number id of its Graph path, so e2e can tell which line it left from.
import { randomUUID } from 'node:crypto';
import { bodyParamCount, ERR, type Json } from './meta.ts';
import { DAY_MS, digits, type Reply, type StubState } from './state.ts';

type TemplateSend = { name?: string; language?: { code?: string }; components?: Json[] };

const bodyParams = (t: TemplateSend): number => {
  const bodyPart = t.components?.find((c) => c['type'] === 'body');
  return Array.isArray(bodyPart?.['parameters']) ? bodyPart['parameters'].length : 0;
};

export function templateError(s: StubState, body: Json): Json | null {
  const t = (body['template'] ?? {}) as TemplateSend;
  const lang = t.language?.code ?? 'ar';
  const found = s.templates.find((x) => x.name === t.name && x.language === lang);
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
function refusal(s: StubState, body: Json, to: string): Reply | null {
  const injected = s.failNext.get(to);
  if (injected) {
    s.failNext.delete(to);
    return [400, injected];
  }
  if (body['type'] === 'template') {
    const err = templateError(s, body);
    return err ? [404, err] : null;
  }
  const windowOpen = Date.now() - (s.lastInbound.get(to) ?? 0) < DAY_MS;
  return s.opts.enforceWindow === false || windowOpen ? null : [400, ERR.window()];
}

/** `phoneNumberId` is the id in the Graph path (`/v*\/{phone_number_id}/messages`). */
export function postMessage(s: StubState, body: Json, phoneNumberId: string): Reply {
  if (body['status'] === 'read') return markRead(s, body, phoneNumberId);
  const to = digits(body['to']);
  const refused = refusal(s, body, to);
  if (refused) return refused;
  const id = `wamid.${randomUUID()}`;
  const type = String(body['type'] ?? 'text');
  const template = (body['template'] as { name?: string } | undefined)?.name;
  s.sent.push({ id, to, type, ...(template ? { template } : {}), body, phoneNumberId });
  return [200, { messaging_product: 'whatsapp', contacts: [{ input: to, wa_id: to }], messages: [{ id }] }];
}
