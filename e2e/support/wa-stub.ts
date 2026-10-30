import { withSql } from './core/schedule';

// Drives tools/wa-stub during e2e (docs/12 §5). The stub runs on STUB_URL (playwright.config.ts
// STUB_PORT) and signs every simulated webhook with the e2e app secret the API was started with.
export const STUB_URL = 'http://localhost:4110';

/** GET (no body) or POST to the stub's control API; throws on a non-2xx answer. */
export async function stub<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${STUB_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`wa-stub ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export interface StubSent {
  id: string;
  to: string;
  type: string;
  template?: string;
  body: unknown;
  /** The phone-number id «Meta» was called on: which line the message left from. */
  phoneNumberId?: string;
  /** Meta's paths or the stub's Kapso prefix (docs/19). */
  via?: 'graph' | 'kapso' | 'crm';
}

/** Everything the API sent to «Meta» since the last reset. */
export const stubSent = () => stub<StubSent[]>('/__stub/messages');

/** Default templates, empty logs; call in beforeEach of messaging journeys. */
export const stubReset = () => stub<{ reset: true }>('/__stub/reset', {});

/** A guardian / lead writes to the academy: text, a quick-reply button, or media. */
export const stubInbound = (spec: {
  from: string;
  name?: string;
  text?: string;
  button?: { text: string; payload: string };
  context?: string;
  /** The line it arrives on (default the notifications line, e2e-phone). */
  phoneNumberId?: string;
}) => stub<{ id: string; status: number }>('/__stub/inbound', spec);

/** Meta reports a delivery status for a wamid the stub accepted. */
export const stubStatus = (spec: { id: string; status: 'sent' | 'delivered' | 'read' | 'failed'; errorCode?: number }) =>
  stub<{ status: number }>('/__stub/status', spec);

/** Meta's review result for a submitted template. */
/** Meta's review result; `waba` picks the copy on that WABA (a template created on one number). */
export const stubTemplateStatus = (name: string, status: 'APPROVED' | 'REJECTED' | 'PAUSED', waba?: string) =>
  stub<unknown>(`/__stub/templates/${name}`, { status, ...(waba ? { waba } : {}) });

/** The admin's kill switch (settings.messaging_enabled): the only switch for sending (docs/23). */
export async function setMessaging(enabled: boolean): Promise<void> {
  await withSql((sql) => sql`
    insert into public.settings (key, value) values ('messaging_enabled', ${sql.json(enabled)})
    on conflict (key) do update set value = excluded.value`);
}
