import { vi } from 'vitest';
import type { CrmLineEnv, WhatsappEnv } from '@/config/env/env';
import type { FetchLike } from '@/modules/messaging/whatsapp';
import { CrmWebhookRegistrar, type CrmWebhookSource } from './crm-webhook.service';

// Test-only (excluded from the build): a scripted CRM webhook API (no network) and the registrar
// over it. Ids, keys and the secret are invented.

export const CRM_LINE: CrmLineEnv = {
  provider: 'crm',
  base: 'https://crm.test.example/api/v1',
  apiKey: 'fake-crm-key',
};
const PUBLIC_URL = 'https://api.test.example';
export const TARGET = 'https://api.test.example/webhooks/wacrm';
/** What the CRM shows once at creation; must never leave the registrar except into setSecret. */
export const FAKE_SECRET = `whsec_${'FAKEfakeFAKEfake'.repeat(3)}`;

interface Answer {
  status: number;
  body: unknown;
}
interface CrmCall {
  method: string;
  path: string;
  body: unknown;
}

export const endpoint = (id: string, url = TARGET) => ({
  id,
  url,
  events: ['message.status_updated'],
  is_active: true,
  last_delivery_at: null,
  failure_count: 0,
  created_at: '2026-11-01T08:00:00Z',
});

const DEFAULTS: Record<string, Answer> = {
  'GET webhooks': { status: 200, body: { data: [] } },
  'POST webhooks': { status: 201, body: { data: { ...endpoint('new-1'), secret: FAKE_SECRET } } },
};

/** `${method} ${path}` → answer (DELETE answers 200 by default). Records every call. */
function fakeCrm(answers: Partial<Record<string, Answer>> = {}) {
  const calls: CrmCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    const path = url.slice(CRM_LINE.base.length + 1);
    const method = init.method ?? 'GET';
    const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    const key = `${method} ${path}`;
    const deleted = { status: 200, body: { data: { id: path, deleted: true } } };
    const a = answers[key] ?? DEFAULTS[key] ?? deleted;
    return new Response(JSON.stringify(a.body), { status: a.status });
  };
  return { fetch, calls };
}

/** The registrar over a fake CRM and a fake «التكاملات» store. */
interface KitOpts {
  answers?: Partial<Record<string, Answer>>;
  line?: WhatsappEnv | null;
}

export function registrarKit(o: KitOpts = {}) {
  const crm = fakeCrm(o.answers);
  const setSecret = vi.fn(async (_input: { key: string; value: string }) => undefined);
  const source: CrmWebhookSource = {
    line: () => (o.line === undefined ? CRM_LINE : o.line),
    publicUrl: () => PUBLIC_URL,
    fetch: crm.fetch,
  };
  const registrar = new CrmWebhookRegistrar({ setSecret }, source);
  return { crm, setSecret, source, registrar };
}
