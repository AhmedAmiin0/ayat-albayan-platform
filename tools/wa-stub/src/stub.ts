// Fake Meta WhatsApp Cloud API for local dev + e2e (CLAUDE.md rule 5). Mirrors the real
// shapes closely enough for WhatsappClient/TemplateRegistry, including error 132001.
import { createHmac, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const DEFAULT_TEMPLATES = [
  'booking_confirmation',
  'lesson_reminder_24h',
  'lesson_reminder_1h',
  'report_ready',
  'renewal_due',
  'follow_up_slots',
];

export interface StubOptions {
  templates?: string[];
  /** API webhook to forward simulated inbound messages to (signed with appSecret). */
  webhookUrl?: string;
  appSecret?: string;
}

export interface SentMessage {
  id: string;
  to: string;
  type: string;
  template?: string;
  body: unknown;
}

type Json = Record<string, unknown>;

async function readJson(req: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length ? (JSON.parse(Buffer.concat(chunks).toString('utf8')) as Json) : {};
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}

const templateError = (name: string) => ({
  error: {
    message: '(#132001) Template name does not exist in the translation',
    type: 'OAuthException',
    code: 132001,
    error_data: { details: `template name (${name}) does not exist in ar` },
  },
});

/** Builds the request handler plus an inspectable log of sent messages. */
export function createStub(opts: StubOptions = {}) {
  const templates = new Set(opts.templates ?? DEFAULT_TEMPLATES);
  const sent: SentMessage[] = [];

  function postMessage(body: Json): [number, unknown] {
    const to = String(body['to'] ?? '');
    const type = String(body['type'] ?? 'text');
    const template = (body['template'] as { name?: string } | undefined)?.name;
    if (type === 'template' && (!template || !templates.has(template))) {
      return [404, templateError(template ?? '')];
    }
    const id = `wamid.${randomUUID()}`;
    sent.push({ id, to, type, ...(template ? { template } : {}), body });
    return [200, { messaging_product: 'whatsapp', contacts: [{ input: to, wa_id: to }], messages: [{ id }] }];
  }

  async function inbound(body: Json): Promise<[number, unknown]> {
    if (!opts.webhookUrl) return [400, { error: 'webhookUrl not configured' }];
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: {
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: body['from'], profile: { name: body['name'] ?? '' } }],
        messages: [{ from: body['from'], id: `wamid.${randomUUID()}`, timestamp: `${Math.floor(Date.now() / 1000)}`,
          type: 'text', text: { body: body['text'] ?? '' } }],
      } }] }],
    });
    const sig = createHmac('sha256', opts.appSecret ?? '').update(payload).digest('hex');
    const res = await fetch(opts.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': `sha256=${sig}` },
      body: payload,
    });
    return [res.status, { forwarded: true }];
  }

  const routes: [string, RegExp, (req: IncomingMessage) => Promise<[number, unknown]>][] = [
    ['POST', /^\/v\d+\.\d+\/[^/]+\/messages$/, async (req) => postMessage(await readJson(req))],
    ['GET', /^\/v\d+\.\d+\/[^/]+\/message_templates$/, async () => [200, {
      data: [...templates].map((name) => ({ name, language: 'ar', status: 'APPROVED' })),
    }]],
    ['GET', /^\/__stub\/messages$/, async () => [200, sent]],
    ['DELETE', /^\/__stub\/messages$/, async () => {
      sent.length = 0;
      return [200, { cleared: true }];
    }],
    ['POST', /^\/__stub\/inbound$/, async (req) => inbound(await readJson(req))],
  ];

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? '/', 'http://stub').pathname;
    const method = req.method ?? 'GET';
    const route = routes.find(([m, re]) => m === method && re.test(path));
    if (!route) return send(res, 404, { error: `no stub route for ${method} ${path}` });
    return send(res, ...(await route[2](req)));
  }

  return { handle, sent };
}
