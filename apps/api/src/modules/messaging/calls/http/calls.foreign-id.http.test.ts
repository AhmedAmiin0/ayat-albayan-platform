import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAMILY, LINE } from '@/modules/messaging/calls/calls.fakes';
import { callsApp } from '@/modules/messaging/calls/test-app';

vi.mock('@/modules/messaging/calls/kapso/calling-line', () => ({
  callingLine: vi.fn(() => LINE),
}));

type App = Awaited<ReturnType<typeof callsApp>>;
let app: App | null = null;
afterEach(async () => {
  await app?.app.close();
  app = null;
});

const OTHER_FAMILY = '+201005555555';
const TEACHER_OWN = '+201009999999';
const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';
const SDP = { sdp: 'v=0\r\no=-' };

async function ringing(t: App, phone: string): Promise<string> {
  const row = await t.queries.insert({
    phone_e164: phone,
    direction: 'inbound',
    status: 'ringing',
    wa_call_id: `wacid.${phone}`,
  });
  return row?.id ?? '';
}

async function placedByAdmin(t: App): Promise<string> {
  const row = await t.queries.insert({
    ...{ phone_e164: FAMILY, direction: 'outbound', status: 'connecting' },
    ...{ wa_call_id: 'wacid.ADMIN', created_by: ADMIN_ID, client_request_id: 'r1' },
  });
  return row?.id ?? '';
}

const nothingSent = (t: App) =>
  [t.api.accept, t.api.reject, t.api.terminate].map((f) => f.mock.calls.length);

describe('POST /calls/:id/accept and /reject: a teacher and another family\'s call', () => {
  it('another family\'s ringing call is 404 to a teacher, and it keeps ringing', async () => {
    app = await callsApp({ on: true });
    const id = await ringing(app, OTHER_FAMILY);
    const accept = await app.call({
      method: 'POST', url: `/calls/${id}/accept`, token: 'teacher', body: SDP,
    });
    const reject = await app.call({ method: 'POST', url: `/calls/${id}/reject`, token: 'teacher' });
    for (const res of [accept, reject]) {
      expect([res.statusCode, res.json().code]).toEqual([404, 'call_not_found']);
    }
    expect(nothingSent(app)).toEqual([0, 0, 0]);
    expect(await app.queries.get(id)).toMatchObject({ status: 'ringing', accepted_by: null });
  });

  it('a call on the teacher\'s own chat with the academy is 404 to that teacher', async () => {
    app = await callsApp({ on: true });
    const id = await ringing(app, TEACHER_OWN);
    const res = await app.call({ method: 'POST', url: `/calls/${id}/reject`, token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'call_not_found']);
    expect(nothingSent(app)).toEqual([0, 0, 0]);
  });

  it('a call in the teacher\'s own family still reaches them (200)', async () => {
    app = await callsApp({ on: true });
    const id = await ringing(app, FAMILY);
    const res = await app.call({ method: 'POST', url: `/calls/${id}/reject`, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(app.api.reject).toHaveBeenCalledTimes(1);
  });
});

describe('POST /calls/:id/end: a call the caller is not in', () => {
  it('a call placed by someone else is 404 to a teacher and to sales, and it goes on', async () => {
    app = await callsApp({ on: true });
    const id = await placedByAdmin(app);
    for (const token of ['teacher', 'sales']) {
      const res = await app.call({ method: 'POST', url: `/calls/${id}/end`, token });
      expect([token, res.statusCode, res.json().code]).toEqual([token, 404, 'call_not_found']);
    }
    expect(nothingSent(app)).toEqual([0, 0, 0]);
    expect(await app.queries.get(id)).toMatchObject({ status: 'connecting', ended_at: null });
  });

  it('the person in the call still ends it (200)', async () => {
    app = await callsApp({ on: true });
    const id = await placedByAdmin(app);
    const res = await app.call({ method: 'POST', url: `/calls/${id}/end` });
    expect([res.statusCode, res.json().status]).toEqual([200, 'ended']);
    expect(app.api.terminate).toHaveBeenCalledTimes(1);
  });
});
