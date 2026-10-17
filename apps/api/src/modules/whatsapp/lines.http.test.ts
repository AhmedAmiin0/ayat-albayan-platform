import type { LineCheckView } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { whatsappApp } from './test-app';

type App = Awaited<ReturnType<typeof whatsappApp>>;
const URL = '/messaging/lines/check';

const view = (line: LineCheckView['line'], configured: boolean): LineCheckView => ({
  line,
  configured,
  provider: 'meta',
  gaps: [],
  phone_number_id: configured ? `${line}-phone` : null,
  waba_id: configured ? `${line}-waba` : null,
  app_id: null,
  display_phone_number: null,
  verified_name: null,
  quality_rating: null,
  status: configured ? 'CONNECTED' : null,
  name_status: null,
  code_verification_status: null,
  subscribed_apps: configured ? [] : null,
  errors: [],
  checked_at: '2026-10-10T08:00:00.000Z',
});

describe('POST /messaging/lines/check (docs/12 §13.9)', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.lines.check.mockResolvedValue([view('notifications', true), view('chat', false)]);
  });

  it('teacher → 403 and nothing is checked', async () => {
    const res = await t.call({ method: 'POST', url: URL, token: 'teacher' });
    expect(res.statusCode).toBe(403);
    expect(t.lines.check).not.toHaveBeenCalled();
  });

  it('admin → 200 with both lines in order [notifications, chat]; no audit row', async () => {
    const res = await t.call({ method: 'POST', url: URL });
    expect(res.statusCode).toBe(200);
    const body: LineCheckView[] = res.json();
    expect(body.map((v) => [v.line, v.configured])).toEqual([['notifications', true], ['chat', false]]);
    expect(body[0]).toEqual(view('notifications', true));
    expect(t.lines.check).toHaveBeenCalledTimes(1);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('the route is POST only (GET is 404)', async () => {
    expect((await t.call({ method: 'GET', url: URL })).statusCode).toBe(404);
    expect(t.lines.check).not.toHaveBeenCalled();
  });

  it('the harness provides a separate chat client (per-line calls are told apart)', () => {
    expect(t.chatClient).not.toBe(t.client);
    expect(Object.keys(t.chatClient)).toEqual(Object.keys(t.client));
  });
});
