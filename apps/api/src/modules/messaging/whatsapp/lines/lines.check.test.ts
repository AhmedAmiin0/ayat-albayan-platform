import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LinesCheck, PHONE_FIELDS } from './lines.check';
import { CHAT_ENV, LINES_RECORDED as R, routedFetch, stubEnvs, TWO_LINES_ENV } from '../whatsapp.lines.fakes';
import { STUB_ENV, type Recorded } from '../whatsapp.fakes';

const N = STUB_ENV.phoneNumberId;
const C = CHAT_ENV.phoneNumberId;
const NW = `${STUB_ENV.wabaId}/subscribed_apps`;
const CW = `${CHAT_ENV.wabaId}/subscribed_apps`;

function checker(routes: Record<string, Recorded | Error>) {
  const f = routedFetch(routes);
  const lines = new LinesCheck();
  lines.fetch = f.fetch;
  return { lines, requests: f.requests };
}

describe('LinesCheck (docs/12 §13.9, R-MSG-05)', () => {
  beforeEach(() => stubEnvs(TWO_LINES_ENV));
  afterEach(() => stubEnvs(null));

  it('chat unset → configured:false with every other field null and ZERO requests for it', async () => {
    stubEnvs({ ...TWO_LINES_ENV, WA_CHAT_PHONE_NUMBER_ID: '', WA_CHAT_WABA_ID: '', WA_CHAT_ACCESS_TOKEN: '', WA_CHAT_APP_ID: '' });
    const { lines, requests } = checker({ [N]: R.phone, [NW]: R.subscribed });
    const [, chat] = await lines.check();
    expect(chat).toEqual({
      line: 'chat', configured: false, phone_number_id: null, waba_id: null, app_id: null, provider: 'meta',
      // WA_CHAT_APP_SECRET is still set, so the chat pieces sending lacks are named (never values).
      gaps: ['WA_CHAT_PHONE_NUMBER_ID', 'WA_CHAT_WABA_ID'], duplicate_chat_phone: false,
      display_phone_number: null, verified_name: null, quality_rating: null, status: null,
      name_status: null, code_verification_status: null, subscribed_apps: null, errors: [],
      checked_at: expect.any(String),
    });
    expect(requests.every((r) => !r.url.includes('chat'))).toBe(true);
    expect(requests).toHaveLength(2);
  });

  it('nothing configured → two unconfigured lines and no request at all', async () => {
    stubEnvs({ WA_API_BASE: '', WA_CHAT_PHONE_NUMBER_ID: '', WA_CHAT_WABA_ID: '' });
    const { lines, requests } = checker({});
    const views = await lines.check();
    expect(views.map((v) => [v.line, v.configured])).toEqual([['notifications', false], ['chat', false]]);
    expect(requests).toHaveLength(0);
  });

  it('both configured → phone facts, ids, own app id and subscribed apps (override included), in order', async () => {
    const { lines } = checker({ [N]: R.phone, [NW]: R.subscribed, [C]: R.chatPhone, [CW]: R.noneSubscribed });
    const [notifications, chat] = await lines.check();
    expect(notifications).toEqual({
      line: 'notifications', configured: true, provider: 'meta', gaps: [], duplicate_chat_phone: false, phone_number_id: N, waba_id: STUB_ENV.wabaId, app_id: 'app-notifications',
      display_phone_number: '+1 555-000-1111', verified_name: 'Ayat Al-Bayan Test', quality_rating: 'GREEN',
      status: 'CONNECTED', name_status: 'APPROVED', code_verification_status: 'NOT_VERIFIED',
      subscribed_apps: [
        { id: 'app-notifications', name: 'Ayat Platform', override_callback_uri: null },
        { id: 'app-crm', name: 'Old CRM', override_callback_uri: 'https://crm.example.test/webhook' },
      ],
      errors: [], checked_at: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
    });
    expect(chat).toMatchObject({
      line: 'chat', configured: true, phone_number_id: C, waba_id: CHAT_ENV.wabaId, app_id: 'app-chat',
      display_phone_number: '+1 555-000-2222', quality_rating: null, status: null, subscribed_apps: [], errors: [],
    });
  });

  it('only GETs: the exact fields query, each line with its own token', async () => {
    const { lines, requests } = checker({ [N]: R.phone, [NW]: R.subscribed, [C]: R.chatPhone, [CW]: R.noneSubscribed });
    await lines.check();
    const base = `${STUB_ENV.base}/${STUB_ENV.version}`;
    expect(requests.map((r) => r.url).sort()).toEqual(
      [`${base}/${N}?fields=${PHONE_FIELDS}`, `${base}/${NW}`, `${base}/${C}?fields=${PHONE_FIELDS}`, `${base}/${CW}`].sort(),
    );
    expect(PHONE_FIELDS).toBe('display_phone_number,verified_name,quality_rating,status,name_status,code_verification_status');
    expect(requests.every((r) => r.init.method === 'GET')).toBe(true);
    const auth = (url: string) => requests.find((r) => r.url.includes(url))?.init.headers;
    expect(auth(C)).toMatchObject({ authorization: 'Bearer chat-token' });
    expect(auth(NW)).toMatchObject({ authorization: 'Bearer test-token' });
  });

  it('a 190 on one call becomes an errors[] entry; the other call and the other line still answer', async () => {
    const { lines } = checker({ [N]: R.badToken, [NW]: R.subscribed, [C]: R.chatPhone, [CW]: R.badToken });
    const [notifications, chat] = await lines.check();
    expect(notifications?.errors).toEqual([{ step: 'phone', code: 190, message: 'Invalid OAuth access token.' }]);
    expect(notifications).toMatchObject({ display_phone_number: null, status: null, subscribed_apps: expect.any(Array) });
    expect(chat?.errors).toEqual([{ step: 'subscribed_apps', code: 190, message: 'Invalid OAuth access token.' }]);
    expect(chat).toMatchObject({ display_phone_number: '+1 555-000-2222', subscribed_apps: null });
  });

  it('errors keep the step order (phone, then subscribed_apps); a rejected fetch is isolated too', async () => {
    const down = new TypeError('fetch failed');
    const { lines } = checker({ [N]: R.badToken, [NW]: down, [C]: R.chatPhone, [CW]: R.subscribed });
    const [notifications, chat] = await lines.check();
    expect(notifications?.errors.map((e) => [e.step, e.code])).toEqual([['phone', 190], ['subscribed_apps', null]]);
    expect(notifications?.errors[1]?.message).toContain('fetch failed');
    expect(chat?.errors).toEqual([]);
  });

  it('a body of the wrong shape is a code-null error, not a crash', async () => {
    const { lines } = checker({ [N]: R.phone, [NW]: { status: 200, body: { data: 'x' } }, [C]: R.chatPhone, [CW]: R.subscribed });
    const [notifications] = await lines.check();
    expect(notifications?.errors).toEqual([{ step: 'subscribed_apps', code: null, message: 'Unexpected WhatsApp response' }]);
  });

  it('override_callback_uri: the sibling (Meta) wins; the nested one is read as a fallback', async () => {
    const app = (uri: string) => ({ id: 'a', name: 'A', override_callback_uri: uri });
    const body = { data: [{ whatsapp_business_api_data: app('https://nested.test/x'), override_callback_uri: 'https://sibling.test/x' }, { whatsapp_business_api_data: app('https://nested.test/y') }] };
    const { lines } = checker({ [N]: R.phone, [NW]: { status: 200, body }, [C]: R.chatPhone, [CW]: R.noneSubscribed });
    const [notifications] = await lines.check();
    expect(notifications?.subscribed_apps?.map((a) => a.override_callback_uri)).toEqual(['https://sibling.test/x', 'https://nested.test/y']);
  });

  it('runs both lines and both calls concurrently (all four requests before any answer)', async () => {
    const pending: ((r: Response) => void)[] = [];
    const lines = new LinesCheck();
    lines.fetch = () => new Promise<Response>((resolve) => pending.push(resolve));
    const run = lines.check();
    await new Promise((r) => setTimeout(r, 0));
    expect(pending).toHaveLength(4);
    for (const resolve of pending) resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    expect(await run).toHaveLength(2);
  });

  it('never returns a token or secret; default timeout is 8 s', async () => {
    const { lines } = checker({ [N]: R.badToken, [NW]: R.subscribed, [C]: R.chatPhone, [CW]: R.subscribed });
    const json = JSON.stringify(await lines.check());
    for (const secret of ['test-token', 'chat-token', 'notifications-secret', 'chat-secret']) expect(json).not.toContain(secret);
    expect(new LinesCheck().timeoutMs).toBe(8000);
  });
});
