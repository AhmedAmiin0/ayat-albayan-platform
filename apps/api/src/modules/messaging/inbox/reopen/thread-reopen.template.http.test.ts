import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { templateRow } from '../../whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { inboxApp } from '../test-app';
import { ReopenSettings } from './reopen.settings';

// The reopen template is the `chat_reopen_template` setting (owner 2026-10-26: inquiry_followup_ar_v2,
// «Wait for v2»: no fallback to inquiry_followup_ar). Fakes only: nothing leaves the process.

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/reopen`;
const STALE = '2026-01-01T00:00:00Z';
const row = (key: string, over: object = {}) =>
  templateRow({ key, meta_name: key, line: 'chat', params: ['contact_name'], buttons: [], body_ar: 'أهلًا {{1}}', ...over });
const reopen = () => t.call({ method: 'POST', url: URL, token: 'admin' });
let t: App;
/** The registry: only these rows exist (by key). */
let registry: Record<string, ReturnType<typeof templateRow>>;

describe('POST /threads/:phone/reopen — the configured template', () => {
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    registry = { inquiry_followup_ar: row('inquiry_followup_ar') };
    vi.spyOn(t.app.get(ReopenSettings), 'read').mockResolvedValue({ chat_reopen_template: 'inquiry_followup_ar_v2' });
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: STALE }));
    t.queries.enqueue.mockImplementation(async (r: object) => messageRow({ ...r, id: 'm9', status: 'queued' }));
    t.queries.get.mockResolvedValue(null);
    t.templates.get.mockImplementation(async (key: string) => registry[key] ?? null);
    t.reopens.requestedSince.mockResolvedValue(false);
    t.kapso.reopen.mockResolvedValue(true);
  });

  it('v2 approved: queued with v2, the dedupe read on v2', async () => {
    registry.inquiry_followup_ar_v2 = row('inquiry_followup_ar_v2');
    expect((await reopen()).json()).toEqual({ kapso_reopened: true, template: 'template_queued' });
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template_key: 'inquiry_followup_ar_v2' }));
    expect(t.reopens.requestedSince).toHaveBeenCalledWith(PHONE, expect.any(Date), 'inquiry_followup_ar_v2');
  });

  it('v2 missing (v1 approved): template_unavailable, Kapso still reopened, nothing queued, no fallback to v1', async () => {
    expect((await reopen()).json()).toEqual({ kapso_reopened: true, template: 'template_unavailable' });
    expect(t.kapso.reopen).toHaveBeenCalledWith(PHONE);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    expect(t.sender.kick).not.toHaveBeenCalled();
    expect(t.templates.get).not.toHaveBeenCalledWith('inquiry_followup_ar');
  });

  it('v2 still pending at Meta, or approved on another line than the thread: template_unavailable', async () => {
    registry.inquiry_followup_ar_v2 = row('inquiry_followup_ar_v2', { status: 'pending' });
    expect((await reopen()).json().template).toBe('template_unavailable');
    registry.inquiry_followup_ar_v2 = row('inquiry_followup_ar_v2', { line: 'notifications' });
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: STALE, last_inbound_line: 'chat' }));
    expect((await reopen()).json().template).toBe('template_unavailable');
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('the setting changed: that key is read, deduped and queued', async () => {
    vi.spyOn(t.app.get(ReopenSettings), 'read').mockResolvedValue({ chat_reopen_template: 'reopen_custom' });
    registry.reopen_custom = row('reopen_custom');
    expect((await reopen()).json().template).toBe('template_queued');
    expect(t.reopens.requestedSince).toHaveBeenCalledWith(PHONE, expect.any(Date), 'reopen_custom');
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template_key: 'reopen_custom' }));
  });
});
