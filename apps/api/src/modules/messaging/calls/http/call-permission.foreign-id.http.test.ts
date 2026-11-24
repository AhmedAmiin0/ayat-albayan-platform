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

const OTHER_FAMILY = encodeURIComponent('+201005555555');
const TEACHER_OWN = encodeURIComponent('+201009999999');
const REQUEST = { clientRequestId: '66666666-6666-4666-8666-666666666666' };

const reached = (t: App) =>
  [t.api.permission, t.api.requestPermission].map((f) => f.mock.calls.length);

describe('/calls/permission/:phone: a teacher and a chat outside their families', () => {
  it('another family\'s permission state is 403 not_your_thread, Kapso is not asked', async () => {
    app = await callsApp({ on: true });
    const res = await app.call({
      method: 'GET', url: `/calls/permission/${OTHER_FAMILY}`, token: 'teacher',
    });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect(reached(app)).toEqual([0, 0]);
  });

  it('asking another family for call permission is 403 and nothing is sent', async () => {
    app = await callsApp({ on: true });
    const res = await app.call({
      method: 'POST', url: `/calls/permission/${OTHER_FAMILY}/request`, token: 'teacher',
      body: REQUEST,
    });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect(reached(app)).toEqual([0, 0]);
  });

  it('the teacher\'s own chat with the academy is 403 and Kapso is not asked', async () => {
    app = await callsApp({ on: true });
    const state = await app.call({
      method: 'GET', url: `/calls/permission/${TEACHER_OWN}`, token: 'teacher',
    });
    const ask = await app.call({
      method: 'POST', url: `/calls/permission/${TEACHER_OWN}/request`, token: 'teacher',
      body: REQUEST,
    });
    expect([state.statusCode, ask.statusCode]).toEqual([403, 403]);
    expect(reached(app)).toEqual([0, 0]);
  });

  it('the teacher\'s own family still reads its state (200)', async () => {
    app = await callsApp({ on: true });
    const res = await app.call({
      method: 'GET', url: `/calls/permission/${encodeURIComponent(FAMILY)}`, token: 'teacher',
    });
    expect([res.statusCode, res.json().state]).toEqual([200, 'granted']);
  });
});
