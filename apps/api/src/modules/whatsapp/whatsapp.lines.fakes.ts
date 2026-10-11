import { vi } from 'vitest';
import type { WhatsappEnv } from '../../env';
import { STUB_ENV, type Recorded } from './whatsapp.fakes';

// Test-only (excluded from the build). The chat line (docs/12 §13.16 item 6) and the diagnostics
// Graph bodies, in the shapes tools/wa-stub and Meta answer (ids invented, no real people).

export const CHAT_ENV: WhatsappEnv = {
  ...STUB_ENV,
  phoneNumberId: 'stub-chat-phone',
  wabaId: 'stub-chat-waba',
  accessToken: 'chat-token',
};

/** Env keys of both lines (vi.stubEnv), with distinct tokens and secrets. */
export const TWO_LINES_ENV = {
  WA_API_BASE: STUB_ENV.base,
  WA_API_VERSION: STUB_ENV.version,
  WA_PHONE_NUMBER_ID: STUB_ENV.phoneNumberId,
  WA_WABA_ID: STUB_ENV.wabaId,
  WA_ACCESS_TOKEN: STUB_ENV.accessToken,
  WA_APP_ID: 'app-notifications',
  WA_APP_SECRET: 'notifications-secret',
  WA_CHAT_PHONE_NUMBER_ID: CHAT_ENV.phoneNumberId,
  WA_CHAT_WABA_ID: CHAT_ENV.wabaId,
  WA_CHAT_ACCESS_TOKEN: CHAT_ENV.accessToken,
  WA_CHAT_APP_ID: 'app-chat',
  WA_CHAT_APP_SECRET: 'chat-secret',
} as const;

export const LINES_RECORDED = {
  phone: {
    status: 200,
    body: {
      display_phone_number: '+1 555-000-1111',
      verified_name: 'Ayat Al-Bayan Test',
      quality_rating: 'GREEN',
      status: 'CONNECTED',
      name_status: 'APPROVED',
      code_verification_status: 'NOT_VERIFIED',
      id: 'stub-phone',
    },
  },
  /** A test number reports fewer fields: the missing ones become null. */
  chatPhone: { status: 200, body: { display_phone_number: '+1 555-000-2222', verified_name: 'Chat Test', id: 'stub-chat-phone' } },
  subscribed: {
    status: 200,
    body: {
      data: [
        {
          whatsapp_business_api_data: {
            id: 'app-notifications',
            name: 'Ayat Platform',
            link: 'https://www.facebook.com/games/?app_id=app-notifications',
          },
        },
        {
          whatsapp_business_api_data: {
            id: 'app-crm',
            name: 'Old CRM',
            link: 'https://www.facebook.com/games/?app_id=app-crm',
            override_callback_uri: 'https://crm.example.test/webhook',
          },
        },
      ],
    },
  },
  noneSubscribed: { status: 200, body: { data: [] } },
  badToken: {
    status: 401,
    body: { error: { message: 'Invalid OAuth access token.', type: 'OAuthException', code: 190, fbtrace_id: 'stub-1' } },
  },
} satisfies Record<string, Recorded>;

/** A fetch that answers by URL (the calls run concurrently, so order is not fixed) and records. */
export function routedFetch(routes: Record<string, Recorded | Error>) {
  const requests: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    requests.push({ url, init });
    const path = url.replace(`${STUB_ENV.base}/${STUB_ENV.version}/`, '').split('?')[0] ?? '';
    const reply = routes[path];
    if (!reply) throw new Error(`unrouted request ${url}`);
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, requests };
}

/** vi.stubEnv each key ('' = unset, as env.ts reads blanks); null = vi.unstubAllEnvs(). */
export function stubEnvs(env: Record<string, string> | null): void {
  if (!env) {
    vi.unstubAllEnvs();
    return;
  }
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}
