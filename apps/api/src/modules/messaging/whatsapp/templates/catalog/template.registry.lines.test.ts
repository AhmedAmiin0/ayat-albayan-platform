import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../../../common/audit/audit.service';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { templateRow } from '../../whatsapp.fakes';
import { WaError, type MetaTemplate, type WhatsappLines } from '../../whatsapp.types';

// The health check per number (owner 2026-10-12, 2026-10-18, docs/12 §3.4): each line syncs only its own
// rows against its own WABA's list, imports that WABA's new templates, and reports its own failure.

const queries = { all: vi.fn(), get: vi.fn(), update: vi.fn(), insert: vi.fn(), approvals: vi.fn(async () => []) };
const client = () => ({ configured: vi.fn(), getTemplates: vi.fn(), submitTemplate: vi.fn() });
let notifications = client();
let chat = client();
const audit = { record: vi.fn() };
const NOW = new Date('2026-10-12T08:00:00Z');
const registry = () =>
  new TemplateRegistry(queries as unknown as TemplatesQueries, { notifications, chat } as unknown as WhatsappLines, audit as unknown as AuditService);

const meta = (name: string, over: Partial<MetaTemplate> = {}): MetaTemplate => ({
  id: `id-${name}`, name, language: 'ar', status: 'APPROVED', category: 'MARKETING', quality: 'GREEN',
  components: [{ type: 'BODY', text: `${name} {{1}}` }], rejectedReason: null, ...over,
});
const crm = templateRow({ key: 'teacher_lesson_v2', meta_name: 'teacher_lesson_v2', line: 'chat', params: ['var_1'], status: 'approved' });
const patched = (key: string) => queries.update.mock.calls.filter(([k]) => k === key).map(([, p]) => p as { status?: string });

describe('TemplateRegistry — per-number sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    notifications = client();
    chat = client();
    notifications.configured.mockReturnValue(true);
    chat.configured.mockReturnValue(true);
    notifications.getTemplates.mockResolvedValue([meta('booking_confirmation'), meta('promo_offer')]);
    chat.getTemplates.mockResolvedValue([meta('teacher_lesson_v2', { status: 'PAUSED' }), meta('academy_welcome'), meta('copy_code', { components: [] })]);
    queries.all.mockResolvedValue([templateRow(), crm]);
    queries.update.mockImplementation(async (key: string, patch: object) => ({ ...templateRow({ key }), ...patch }));
    queries.insert.mockImplementation(async (row: object) => ({ ...templateRow(), ...row }));
  });

  it('both lines: each against its own list; each WABA’s new templates imported on its line, with skip reasons', async () => {
    const { lines } = await registry().verifyAll({ now: NOW });
    expect(patched('booking_confirmation')).toEqual([expect.objectContaining({ status: 'approved' })]);
    expect(patched('teacher_lesson_v2')).toEqual([expect.objectContaining({ status: 'paused' })]);
    expect(queries.insert).toHaveBeenCalledWith(expect.objectContaining({ key: 'promo_offer', line: 'notifications', sales_starter: false }));
    expect(queries.insert).toHaveBeenCalledWith(expect.objectContaining({ key: 'academy_welcome', line: 'chat', sales_starter: false }));
    expect(lines.map((l) => [l.line, l.ok, l.meta_count, l.synced, l.imported])).toEqual([
      ['notifications', true, 2, 1, ['promo_offer']],
      ['chat', true, 3, 1, ['academy_welcome']],
    ]);
    expect(lines[1]?.skipped).toEqual([{ name: 'copy_code (ar)', reason: { code: 'no_body' } }]);
  });

  it('line=chat: only chat rows, only the chat list; notifications is never read', async () => {
    const { lines } = await registry().verifyAll({ line: 'chat', now: NOW });
    expect(notifications.getTemplates).not.toHaveBeenCalled();
    expect(patched('booking_confirmation')).toEqual([]);
    expect(patched('teacher_lesson_v2')).toHaveLength(1);
    expect(lines.map((l) => l.line)).toEqual(['chat']);
  });

  it('chat-only config: syncing chat works (no 503), and syncing both syncs chat alone', async () => {
    notifications.configured.mockReturnValue(false);
    await expect(registry().verifyAll({ line: 'chat', now: NOW })).resolves.toMatchObject({ lines: [{ line: 'chat', ok: true }] });
    await expect(registry().verifyAll({ now: NOW })).resolves.toMatchObject({ lines: [{ line: 'chat', ok: true }] });
    expect(notifications.getTemplates).not.toHaveBeenCalled();
  });

  it('a chat read failure reaches the admin as that line’s error; chat rows untouched, notifications still synced', async () => {
    chat.getTemplates.mockRejectedValue(new WaError('(#190) Invalid OAuth access token', { code: 190, status: 401 }));
    const { lines } = await registry().verifyAll({ now: NOW });
    expect(lines[1]).toMatchObject({ line: 'chat', ok: false, error: 'meta_error', message: '(#190) Invalid OAuth access token', imported: [] });
    expect(lines[0]).toMatchObject({ line: 'notifications', ok: true });
    expect(patched('teacher_lesson_v2')).toEqual([]);
  });

  it('a Kapso key refusal on the chat line is kapso_auth', async () => {
    chat.getTemplates.mockRejectedValue(new WaError('Invalid API key', { code: null, status: 401, credential: 'kapso' }));
    const { lines } = await registry().verifyAll({ line: 'chat', now: NOW });
    expect(lines[0]).toMatchObject({ ok: false, error: 'kapso_auth' });
  });

  it('one line: a chat row is never matched against the notifications list (no cross-WABA missing)', async () => {
    chat.configured.mockReturnValue(false);
    const { lines } = await registry().verifyAll({ now: NOW });
    expect(chat.getTemplates).not.toHaveBeenCalled();
    expect(patched('teacher_lesson_v2')).toEqual([]);
    expect(lines.map((l) => l.line)).toEqual(['notifications']);
  });

  it('a notifications row absent from the notifications list goes missing, even when the chat WABA has it', async () => {
    notifications.getTemplates.mockResolvedValue([]);
    chat.getTemplates.mockResolvedValue([meta('booking_confirmation')]);
    await registry().verifyAll({ now: NOW });
    expect(patched('booking_confirmation')).toEqual([expect.objectContaining({ status: 'missing' })]);
  });

  it('line=chat while chat is not configured: 503 not_configured naming the line', async () => {
    chat.configured.mockReturnValue(false);
    await expect(registry().verifyAll({ line: 'chat' })).rejects.toMatchObject({ response: { code: 'not_configured', line: 'chat' } });
  });

  it('GET lines: facts per line, the newest check of its rows, its last sync since boot', async () => {
    queries.all.mockResolvedValue([templateRow({ last_checked_at: '2026-10-01T00:00:00Z' }), crm]);
    const r = registry();
    await r.verifyAll({ line: 'chat', now: NOW });
    const views = await r.lineViews();
    expect(views.map((v) => [v.line, v.configured, v.last_checked_at, v.last_sync?.ok ?? null])).toEqual([
      ['notifications', true, '2026-10-01T00:00:00Z', null],
      ['chat', true, null, true],
    ]);
  });
});
