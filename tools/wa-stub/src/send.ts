// POST /{phone_number_id}/messages (docs/12 §5, §13.12): sends and read receipts. Every send and
// read records the phone-number id of its Graph path, so e2e can tell which line it left from.
import { randomUUID } from 'node:crypto';
import { lineOf } from './lines.ts';
import { bodyParamCount, ERR, onWaba, type Json, type StubTemplate } from './providers/meta.ts';
import { DAY_MS, digits, type Reply, type StubState } from './state.ts';

interface TemplateSend {
  name?: string;
  language?: { code?: string };
  components?: Json[];
}

const bodyParams = (t: TemplateSend): number => {
  const bodyPart = t.components?.find((c) => c.type === 'body');
  return Array.isArray(bodyPart?.parameters) ? bodyPart.parameters.length : 0;
};

const templateLang = (t: TemplateSend): string => t.language?.code ?? 'ar';

const UNSENDABLE = new Set(['PENDING', 'REJECTED', 'DISABLED']);

const isSendable = (found: StubTemplate | undefined): found is StubTemplate =>
  found !== undefined && !UNSENDABLE.has(found.status);

/** The error of a template that is on the WABA and sendable: paused, or a parameter mismatch. */
function sendableError(found: StubTemplate, t: TemplateSend): Json | null {
  const got = bodyParams(t);
  const want = bodyParamCount(found);
  const paramsError = got === want ? null : ERR.params(want, got);
  return found.status === 'PAUSED' ? ERR.paused(found.name) : paramsError;
}

/** Meta's answer to a template send from `phoneNumberId`: the template must be on its WABA. */
export function templateError(s: StubState, body: Json, phoneNumberId: string): Json | null {
  const t = (body.template ?? {}) as TemplateSend;
  const lang = templateLang(t);
  const waba = lineOf(s.opts, phoneNumberId)?.wabaId;
  const found = s.templates.find(
    (x) => x.name === t.name && x.language === lang && onWaba(x, waba),
  );
  return isSendable(found) ? sendableError(found, t) : ERR.noTemplate(t.name ?? '', lang);
}

function markRead(s: StubState, body: Json, phoneNumberId: string): Reply {
  const messageId = String(body.message_id ?? '');
  s.reads.push(messageId);
  s.readLog.push({ phoneNumberId, messageId });
  return [200, { success: true }];
}

/** An image or document must carry a `link` or uploaded `id` (Meta: 100); catches dispatch bugs. */
function mediaError(body: Json): Json | null {
  const type = body.type;
  if (type !== 'image' && type !== 'document') return null;
  const media = (body[type] ?? {}) as { link?: unknown; id?: unknown };
  return media.link || media.id ? null : ERR.invalid(`${type} needs a link or an id`);
}

/**
 * Meta's refusal of a send to `to`: an injected failure, template or media error, or closed window.
 */
function injectedFailure(s: StubState, to: string): Reply | null {
  const injected = s.failNext.get(to);
  s.failNext.delete(to);
  return injected ? [400, injected] : null;
}

function windowRefusal(s: StubState, to: string): Reply | null {
  const windowOpen = Date.now() - (s.lastInbound.get(to) ?? 0) < DAY_MS;
  return s.opts.enforceWindow === false || windowOpen ? null : [400, ERR.window()];
}

interface Send {
  body: Json;
  to: string;
  phoneNumberId: string;
}

/** A template send is judged by its template alone; any other by its media and the window. */
function contentRefusal(s: StubState, send: Send): Reply | null {
  const { body, to } = send;
  const isTemplate = body.type === 'template';
  const bad = isTemplate ? templateError(s, body, send.phoneNumberId) : mediaError(body);
  const window = isTemplate ? null : windowRefusal(s, to);
  return bad ? [isTemplate ? 404 : 400, bad] : window;
}

/**
 * Meta's refusal of a send to `to`: an injected failure, template or media error, or closed window.
 */
function refusal(s: StubState, send: Send): Reply | null {
  return injectedFailure(s, send.to) ?? contentRefusal(s, send);
}

/**
 * `phoneNumberId`: the id in the Graph path (`/v*\/{phone_number_id}/messages`); `via`: its prefix.
 */
export function postMessage(
  s: StubState,
  body: Json,
  at: { phoneNumberId: string; via: 'graph' | 'kapso' },
): Reply {
  const { phoneNumberId } = at;
  if (body.status === 'read') return markRead(s, body, phoneNumberId);
  const to = digits(body.to);
  const refused = refusal(s, { body, to, phoneNumberId });
  if (refused) return refused;
  const id = `wamid.${randomUUID()}`;
  const type = String(body.type ?? 'text');
  const template = (body.template as { name?: string } | undefined)?.name;
  s.sent.push({
    id,
    to,
    type,
    ...(template ? { template } : {}),
    body,
    phoneNumberId,
    via: at.via,
  });
  return [
    200,
    { messaging_product: 'whatsapp', contacts: [{ input: to, wa_id: to }], messages: [{ id }] },
  ];
}
