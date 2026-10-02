// Test-only control routes under /__stub (docs/12 §5): inspect what was sent, simulate inbound
// messages / delivery statuses (signed webhooks), approve templates, inject send failures.
import { randomUUID } from 'node:crypto';
import { defaultTemplates, metaError } from './meta.ts';
import { digits, readJson, type Route, type StubState } from './state.ts';
import { forward, inboundValue, statusValue, type InboundSpec, type StatusSpec, type WebhookTarget } from './webhook.ts';

function target(s: StubState): WebhookTarget | null {
  const { webhookUrl, appSecret, phoneNumberId } = s.opts;
  return webhookUrl ? { url: webhookUrl, appSecret: appSecret ?? '', phoneNumberId: phoneNumberId ?? 'stub-phone' } : null;
}

async function inbound(s: StubState, spec: InboundSpec) {
  const t = target(s);
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
  const t = target(s);
  if (!t) return [400, { error: 'webhookUrl not configured' }] as const;
  const msg = s.sent.find((m) => m.id === spec.id);
  if (!msg) return [404, { error: `no sent message ${spec.id}` }] as const;
  const status = await forward(t, statusValue(spec, msg.to));
  return [200, { forwarded: true, status }] as const;
}

export const controlRoutes: Route[] = [
  ['GET', /^\/__stub\/health$/, async () => [200, { ok: true }]],
  ['GET', /^\/__stub\/messages$/, async (_r, _m, s) => [200, s.sent]],
  ['DELETE', /^\/__stub\/messages$/, async (_r, _m, s) => {
    s.sent.length = 0;
    s.reads.length = 0;
    return [200, { cleared: true }];
  }],
  ['GET', /^\/__stub\/reads$/, async (_r, _m, s) => [200, s.reads]],
  ['GET', /^\/__stub\/templates$/, async (_r, _m, s) => [200, s.templates]],
  /** Whole reset between e2e tests: default templates, empty logs, media, windows, failures. */
  ['POST', /^\/__stub\/reset$/, async (_r, _m, s) => {
    s.templates = s.opts.templates ?? defaultTemplates();
    s.sent.length = 0;
    s.reads.length = 0;
    s.media.clear();
    s.lastInbound.clear();
    s.failNext.clear();
    s.uploads.clear();
    s.handles.clear();
    return [200, { reset: true }];
  }],
  ['POST', /^\/__stub\/inbound$/, async (req, _m, s) => [...(await inbound(s, (await readJson(req)) as unknown as InboundSpec))]],
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
];
