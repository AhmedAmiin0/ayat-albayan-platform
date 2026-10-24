import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { lineEnvs, loadEnv } from '../../env';
import { KAPSO_ENV, kapsoFetch } from './kapso.fakes';
import { RECORDED_UPLOAD, RENEWAL_DUE_SEED, REPORT_READY_SEED } from './seed-templates.fakes';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { whatsappClient } from './client-factory';
import { scriptedFetch } from './whatsapp.fakes';
import { type WhatsappLines } from './whatsapp.types';

// Owner 2026-10-18: a template is submitted to its OWN line's WABA, chat rows included, under that
// line's driver: Meta directly, or Kapso (a rejected one edited through hsm_id; no sample upload).

const queries = { get: vi.fn(), update: vi.fn() };
const audit = { record: vi.fn() };
const mock = () => ({ configured: vi.fn(() => true), submitTemplate: vi.fn(), canUploadSamples: vi.fn(), uploadSample: vi.fn() });
const registry = (lines: object) => new TemplateRegistry(queries as unknown as TemplatesQueries, lines as WhatsappLines, audit as unknown as AuditService);
const failure = (p: Promise<unknown>) => p.then(() => null, (e: { getStatus: () => number; getResponse: () => unknown }) => [e.getStatus(), e.getResponse()]);
/** The chat line on Meta with its own ids (and whatever else `over` sets). */
function stubChat(over: Record<string, string>): void {
  const all = { WA_CHAT_PROVIDER: 'meta', WA_API_BASE: 'http://127.0.0.1:4010', WA_API_VERSION: 'v21.0', WA_CHAT_PHONE_NUMBER_ID: 'chat-phone', WA_CHAT_WABA_ID: 'chat-waba', WA_CHAT_ACCESS_TOKEN: 'chat-token', WA_CHAT_APP_ID: '', ...over };
  Object.entries(all).forEach(([k, v]) => vi.stubEnv(k, v));
}
const CHAT_ROW = { ...RENEWAL_DUE_SEED, key: 'trial_reschedule', line: 'chat' as const };

beforeEach(() => {
  vi.resetAllMocks();
  queries.update.mockImplementation(async (_k: string, patch: object) => ({ ...CHAT_ROW, ...patch }));
});
afterEach(() => vi.unstubAllEnvs());

describe('submit to the template’s own number', () => {
  it('a chat row goes to the chat WABA (Meta driver), never to notifications; audited with its line', async () => {
    const notifications = mock();
    const chat = mock();
    chat.submitTemplate.mockResolvedValue({ metaId: 'c-1', status: 'PENDING' });
    queries.get.mockResolvedValue(CHAT_ROW);
    await expect(registry({ notifications, chat }).submit('trial_reschedule', 'admin-1')).resolves.toMatchObject({ status: 'pending', line: 'chat' });
    expect(chat.submitTemplate).toHaveBeenCalledWith(CHAT_ROW, { headerHandle: undefined });
    expect(notifications.submitTemplate).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ after: { key: 'trial_reschedule', status: 'pending', meta_id: 'c-1', line: 'chat' } }));
  });

  it('the chat line not configured: 503 not_configured naming chat, nothing sent anywhere', async () => {
    const notifications = mock();
    const chat = mock();
    chat.configured.mockReturnValue(false);
    queries.get.mockResolvedValue(CHAT_ROW);
    expect(await failure(registry({ notifications, chat }).submit('trial_reschedule', 'a'))).toEqual([503, { code: 'not_configured', message: 'not_configured', line: 'chat' }]);
    expect(notifications.submitTemplate).not.toHaveBeenCalled();
  });

  it('chat on Kapso: a new one is created on the chat WABA through Kapso', async () => {
    vi.stubEnv('WA_CHAT_PROVIDER', 'kapso');
    const f = kapsoFetch({ status: 200, body: { id: 'k-1', status: 'PENDING' } });
    queries.get.mockResolvedValue(CHAT_ROW);
    const lines = { notifications: mock(), chat: whatsappClient({ ...KAPSO_ENV, wabaId: 'chat-waba' }, { fetch: f.fetch }) };
    await registry(lines).submit('trial_reschedule', 'a');
    expect(f.requests.map((r) => r.url)).toEqual([`${KAPSO_ENV.base}/${KAPSO_ENV.version}/chat-waba/message_templates`]);
  });

  it('chat on Kapso: a rejected one is edited in place through hsm_id', async () => {
    vi.stubEnv('WA_CHAT_PROVIDER', 'kapso');
    const f = kapsoFetch({ status: 200, body: { success: true } });
    queries.get.mockResolvedValue({ ...CHAT_ROW, status: 'rejected', meta_id: '777' });
    const lines = { notifications: mock(), chat: whatsappClient({ ...KAPSO_ENV, wabaId: 'chat-waba' }, { fetch: f.fetch }) };
    await registry(lines).submit('trial_reschedule', 'a');
    expect(f.requests[0]?.url).toBe(`${KAPSO_ENV.base}/${KAPSO_ENV.version}/chat-waba/message_templates?hsm_id=777`);
  });

  it('chat on Kapso: a document header is 409 needs_meta_driver, and nothing reaches Kapso', async () => {
    vi.stubEnv('WA_CHAT_PROVIDER', 'kapso');
    vi.stubEnv('WA_PROVIDER', 'meta');
    const f = kapsoFetch();
    queries.get.mockResolvedValue({ ...REPORT_READY_SEED, line: 'chat' });
    const lines = { notifications: mock(), chat: whatsappClient(KAPSO_ENV, { fetch: f.fetch }) };
    expect(await failure(registry(lines).submit('report_ready', 'a'))).toEqual([409, { code: 'needs_meta_driver', message: 'needs_meta_driver', line: 'chat' }]);
    expect(f.requests).toHaveLength(0);
    expect(queries.update).not.toHaveBeenCalled();
  });

  it('chat on Meta with WA_CHAT_APP_ID: a document header uploads its sample under the chat app, then goes to the chat WABA', async () => {
    stubChat({ WA_CHAT_APP_ID: 'chat-app' });
    const env = lineEnvs(loadEnv()).chat;
    expect(env).toMatchObject({ appId: 'chat-app', wabaId: 'chat-waba' });
    const f = scriptedFetch(RECORDED_UPLOAD.session, RECORDED_UPLOAD.handle, RECORDED_UPLOAD.createDoc);
    queries.get.mockResolvedValue({ ...REPORT_READY_SEED, line: 'chat' });
    const notifications = mock();
    await registry({ notifications, chat: whatsappClient(env, { fetch: f.fetch }) }).submit('report_ready', 'a');
    const urls = f.requests.map((r) => r.url.replace('http://127.0.0.1:4010/v21.0/', ''));
    expect(urls[0]).toMatch(/^chat-app\/uploads\?/);
    expect(urls[2]).toBe('chat-waba/message_templates');
    expect(notifications.submitTemplate).not.toHaveBeenCalled();
  });

  it('chat on Meta without WA_CHAT_APP_ID: 409 needs_app_id naming chat, nothing sent', async () => {
    stubChat({});
    const f = scriptedFetch();
    queries.get.mockResolvedValue({ ...REPORT_READY_SEED, line: 'chat' });
    const lines = { notifications: mock(), chat: whatsappClient(lineEnvs(loadEnv()).chat, { fetch: f.fetch }) };
    expect(await failure(registry(lines).submit('report_ready', 'a'))).toEqual([409, { code: 'needs_app_id', message: 'needs_app_id', line: 'chat' }]);
    expect(f.requests).toHaveLength(0);
  });
});
