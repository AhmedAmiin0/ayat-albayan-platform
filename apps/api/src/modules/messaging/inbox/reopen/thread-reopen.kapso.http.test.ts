import { Logger } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { KAPSO_ENV } from '../../whatsapp/drivers/kapso/kapso.fakes';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { templateRow } from '../../whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { inboxApp } from '../test-app';
import { kapsoReopen } from './kapso-reopener';

// Owner 2026-10-27: the reopen template never went out. Kapso (step 3) ran before the template and
// could hold the request open, or throw out of it; now they run side by side and Kapso is bounded.
// Fakes only: a fake Kapso fetch, the sender mocked, nothing leaves the process.

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/reopen`;
const REOPEN = templateRow({ key: 'inquiry_followup_ar_v2', meta_name: 'inquiry_followup_ar_v2', line: 'chat', params: [], buttons: [], body_ar: 'أهلًا' });
const reopen = (token = 'admin') => t.call({ method: 'POST', url: URL, token });
const log = new Logger('t');
const hang = () => new Promise<Response>(() => undefined);
let t: App;

describe('POST /threads/:phone/reopen — Kapso never holds the template', () => {
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(log, 'warn').mockImplementation(() => undefined);
    t.reopens.templateKey.mockResolvedValue('inquiry_followup_ar_v2');
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-01-01T00:00:00Z', last_inbound_line: 'chat' }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', status: 'queued' }));
    t.queries.get.mockResolvedValue(null);
    t.templates.get.mockResolvedValue(REOPEN);
    t.reopens.requestedSince.mockResolvedValue(false);
  });

  it('a Kapso that never answers: the request still answers and ONE template row is queued', async () => {
    t.kapso.reopen.mockImplementation(() => kapsoReopen({ phone: PHONE, readEnv: () => KAPSO_ENV, fetch: hang, timeoutMs: 20 }, log));
    const res = await reopen();
    expect([res.statusCode, res.json()]).toEqual([200, { kapso_reopened: false, template: 'template_queued' }]);
    expect(t.queries.enqueue).toHaveBeenCalledTimes(1);
  });

  it('the env read throws (Kapso step): the template is still queued', async () => {
    const readEnv = () => {
      throw new Error('bad env');
    };
    t.kapso.reopen.mockImplementation(() => kapsoReopen({ phone: PHONE, readEnv }, log));
    expect((await reopen()).json()).toEqual({ kapso_reopened: false, template: 'template_queued' });
  });

  it('the template is queued while Kapso is still on its way', async () => {
    let done: (v: boolean) => void = () => undefined;
    t.kapso.reopen.mockReturnValue(new Promise<boolean>((r) => (done = r)));
    const res = reopen();
    await vi.waitFor(() => expect(t.queries.enqueue).toHaveBeenCalledTimes(1));
    done(true);
    expect((await res).json()).toEqual({ kapso_reopened: true, template: 'template_queued' });
  });

  it('an admin (system permissions): never restricted, and no warn line for a queued template', async () => {
    t.kapso.reopen.mockResolvedValue(false);
    expect((await reopen()).json().template).toBe('template_queued');
    expect(Logger.prototype.warn).not.toHaveBeenCalledWith(expect.stringContaining('reopen for'));
  });

  it('every other outcome: one warn line with the last 4 digits only', async () => {
    t.kapso.reopen.mockResolvedValue(false);
    t.reopens.requestedSince.mockResolvedValue(true);
    expect((await reopen()).json().template).toBe('already_requested_today');
    const lines = vi.mocked(Logger.prototype.warn).mock.calls.map((c) => String(c[0])).filter((l) => l.includes('reopen for'));
    expect(lines).toEqual(['reopen for …4567: already_requested_today']);
  });
});
