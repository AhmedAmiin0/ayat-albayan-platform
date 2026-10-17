// Test-only control routes under /__stub (docs/12 §5): inspect what was sent, simulate inbound
// messages / delivery statuses (signed webhooks), approve templates, inject send failures.
import { randomUUID } from 'node:crypto';
import { diagnosticControlRoutes, resetHealth } from './diagnostics.ts';
import { lineOf, stubLines } from './lines.ts';
import { metaError } from './meta.ts';
import { digits, readJson, type Route, type StubState } from './state.ts';
import { initialTemplates } from './templates.ts';
import { forward, inboundValue, statusValue, type InboundSpec, type StatusSpec, type WebhookTarget } from './webhook.ts';

/**
 * The webhook of the line `phoneNumberId` belongs to (default notifications): its secret, display
 * number and entry id. An unknown id keeps the notifications identity with that id in metadata.
 */
function target(s: StubState, phoneNumberId?: string): WebhookTarget | null {
  if (!s.opts.webhookUrl) return null;
  const line = lineOf(s.opts, phoneNumberId) ?? stubLines(s.opts)[0];
  const { appSecret, displayPhone, entryId } = line;
  return { url: s.opts.webhookUrl, appSecret, phoneNumberId: phoneNumberId ?? line.phoneNumberId, displayPhone, entryId };
}

/** The same line identity, delivered as Kapso forwards it: its webhook URL and secret (docs/19). */
function kapsoTarget(s: StubState, phoneNumberId?: string): WebhookTarget | null {
  const line = target({ ...s, opts: { ...s.opts, webhookUrl: s.opts.kapso?.webhookUrl } }, phoneNumberId);
  return line ? { ...line, appSecret: s.opts.kapso?.webhookSecret ?? '', kapso: true } : null;
}

async function inbound(s: StubState, spec: InboundSpec, viaKapso = false) {
  const line = viaKapso ? kapsoTarget(s, spec.phoneNumberId) : target(s, spec.phoneNumberId);
  const t = line && spec.signWith !== undefined ? { ...line, appSecret: spec.signWith } : line;
  if (!t) return [400, { error: 'webhookUrl not configured' }] as const;
  if (!digits(spec.from)) return [400, { error: 'from is required' }] as const;
  let mediaId: string | null = null;
  if (spec.media) {
    mediaId = randomUUID().replace(/-/g, '');
    s.media.set(mediaId, { mime: spec.media.mime, bytes: Buffer.from(spec.media.base64 ?? '', 'base64') });
  }
  const id = `wamid.${randomUUID()}`;
  s.lastInbound.set(digits(spec.from), (spec.timestamp ?? Date.now() / 1000) * 1000);
  const status = await forward(t, inboundValue(spec, { message: id, media: mediaId }));
  return [200, { forwarded: true, status, id, mediaId }] as const;
}

async function deliveryStatus(s: StubState, spec: StatusSpec) {
  if (!s.opts.webhookUrl) return [400, { error: 'webhookUrl not configured' }] as const;
  const msg = s.sent.find((m) => m.id === spec.id);
  if (!msg) return [404, { error: `no sent message ${spec.id}` }] as const;
  // Meta reports a status on the line that sent the message (a path id of no line: notifications).
  const t = target(s, lineOf(s.opts, msg.phoneNumberId)?.phoneNumberId);
  if (!t) return [400, { error: 'webhookUrl not configured' }] as const;
  const status = await forward(t, statusValue(spec, msg.to));
  return [200, { forwarded: true, status }] as const;
}

export const controlRoutes: Route[] = [
  ['GET', /^\/__stub\/health$/, async () => [200, { ok: true }]],
  ['GET', /^\/__stub\/messages$/, async (_r, _m, s) => [200, s.sent]],
  ['DELETE', /^\/__stub\/messages$/, async (_r, _m, s) => {
    s.sent.length = 0;
    s.reads.length = 0;
    s.readLog.length = 0;
    s.requests.length = 0;
    return [200, { cleared: true }];
  }],
  ['GET', /^\/__stub\/reads$/, async (_r, _m, s) => [200, s.reads]],
  ['GET', /^\/__stub\/reads\/by-line$/, async (_r, _m, s) => [200, s.readLog]],
  ['GET', /^\/__stub\/templates$/, async (_r, _m, s) => [200, s.templates]],
  /** Whole reset between e2e tests: default templates (and the chat starter), empty logs, media, windows, failures. */
  ['POST', /^\/__stub\/reset$/, async (_r, _m, s) => {
    s.templates = initialTemplates(s.opts);
    s.sent.length = 0;
    s.reads.length = 0;
    s.readLog.length = 0;
    s.media.clear();
    s.lastInbound.clear();
    s.failNext.clear();
    s.uploads.clear();
    s.handles.clear();
    s.requests.length = 0;
    resetHealth(s);
    return [200, { reset: true }];
  }],
  ['POST', /^\/__stub\/inbound$/, async (req, _m, s) => [...(await inbound(s, (await readJson(req)) as unknown as InboundSpec))]],
  /** The same inbound, forwarded by «Kapso» to its webhook URL with X-Webhook-Signature (docs/19). */
  ['POST', /^\/__stub\/kapso\/inbound$/, async (req, _m, s) => [...(await inbound(s, (await readJson(req)) as unknown as InboundSpec, true))]],
  /** Every Graph call with its prefix and credential kind (bearer / api-key / …). */
  ['GET', /^\/__stub\/requests$/, async (_r, _m, s) => [200, s.requests]],
  ['POST', /^\/__stub\/status$/, async (req, _m, s) => [...(await deliveryStatus(s, (await readJson(req)) as unknown as StatusSpec))]],
  /** Meta's review result: {status: 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED', quality?}. */
  ['POST', /^\/__stub\/templates\/([a-z0-9_]+)$/, async (req, m, s) => {
    const body = await readJson(req);
    const t = s.templates.find((x) => x.name === m[1]);
    if (!t) return [404, { error: `no template ${m[1] ?? ''}` }];
    t.status = String(body['status'] ?? t.status);
    t.quality = String(body['quality'] ?? t.quality);
    return [200, t];
  }],
  /** The next send to `to` fails with Meta error `code` (default 131026 undeliverable). */
  ['POST', /^\/__stub\/fail$/, async (req, _m, s) => {
    const body = await readJson(req);
    const code = Number(body['code'] ?? 131026);
    s.failNext.set(digits(body['to']), metaError(code, String(body['title'] ?? 'Simulated failure')));
    return [200, { armed: true, code }];
  }],
  ['GET', /^\/__stub\/media\/([a-f0-9]+)$/, async (_r, m, s) => {
    const media = s.media.get(m[1] ?? '');
    return media ? { status: 200, mime: media.mime, bytes: media.bytes } : [404, { error: 'no media' }];
  }],
  ...diagnosticControlRoutes,
];
