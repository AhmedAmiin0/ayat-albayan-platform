import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { RENEWAL_DUE_SEED } from './seed-templates.fakes';
import { templateRow } from './whatsapp.fakes';
import { WaError, type MetaTemplate, type WhatsappLines } from './whatsapp.types';

// The health check per line (owner 2026-10-12, docs/12 §3.4): each row against its own line's list,
// the chat line's new templates imported (only the restricted defaults flagged), a chat row never submitted.

const queries = { all: vi.fn(), get: vi.fn(), update: vi.fn(), insert: vi.fn() };
const client = () => ({ configured: vi.fn(), getTemplates: vi.fn(), submitTemplate: vi.fn() });
let notifications = client();
let chat = client();
const audit = { record: vi.fn() };
const NOW = new Date('2026-10-12T08:00:00Z');
const registry = () =>
  new TemplateRegistry(queries as unknown as TemplatesQueries, { notifications, chat } as unknown as WhatsappLines, audit as unknown as AuditService);
const status = (p: Promise<unknown>) => p.then(() => 'ok', (e: { getStatus: () => number; getResponse: () => unknown }) => [e.getStatus(), e.getResponse()]);

const meta = (name: string, over: Partial<MetaTemplate> = {}): MetaTemplate => ({
  id: `id-${name}`, name, language: 'ar', status: 'APPROVED', category: 'MARKETING', quality: 'GREEN',
  components: [{ type: 'BODY', text: `${name} {{1}}` }], rejectedReason: null, ...over,
});
const crm = templateRow({ key: 'teacher_lesson_v2', meta_name: 'teacher_lesson_v2', line: 'chat', params: ['var_1'] });
const patched = (key: string) => queries.update.mock.calls.filter(([k]) => k === key).map(([, p]) => p as { status?: string });

describe('TemplateRegistry — two lines', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    notifications = client();
    chat = client();
    notifications.configured.mockReturnValue(true);
    chat.configured.mockReturnValue(true);
    notifications.getTemplates.mockResolvedValue([meta('booking_confirmation')]);
    chat.getTemplates.mockResolvedValue([meta('teacher_lesson_v2', { status: 'PAUSED' }), meta('academy_welcome')]);
    queries.all.mockResolvedValue([templateRow(), crm]);
    queries.update.mockImplementation(async (key: string, patch: object) => ({ ...templateRow({ key }), ...patch }));
    queries.insert.mockImplementation(async (row: object) => ({ ...templateRow(), ...row }));
  });

  it('notifications rows against notifications, chat rows against chat; new chat templates imported unflagged', async () => {
    const views = await registry().verifyAll(NOW);
    expect(patched('booking_confirmation')).toEqual([expect.objectContaining({ status: 'approved' })]);
    expect(patched('teacher_lesson_v2')).toEqual([expect.objectContaining({ status: 'paused' })]);
    expect(queries.insert).toHaveBeenCalledTimes(1);
    expect(queries.insert).toHaveBeenCalledWith(expect.objectContaining({ key: 'academy_welcome', line: 'chat', sales_starter: false, status: 'approved' }));
    expect(views.map((v) => v.key)).toEqual(['booking_confirmation', 'teacher_lesson_v2', 'academy_welcome']);
  });

  it('welcome_greeting comes flagged; the sync never writes the flag of a known row (the admin’s toggle wins)', async () => {
    const flagged = templateRow({ key: 'teacher_lesson_v2', meta_name: 'teacher_lesson_v2', line: 'chat', params: ['var_1'], sales_starter: true });
    queries.all.mockResolvedValue([templateRow(), flagged]);
    chat.getTemplates.mockResolvedValue([meta('teacher_lesson_v2'), meta('welcome_greeting')]);
    await registry().verifyAll(NOW);
    expect(queries.insert).toHaveBeenCalledWith(expect.objectContaining({ key: 'welcome_greeting', sales_starter: true }));
    expect(queries.update.mock.calls.every(([, p]) => !('sales_starter' in (p as object)))).toBe(true);
  });

  it('an import that was already there (ignored duplicate) is not listed twice', async () => {
    queries.insert.mockResolvedValue(null);
    expect((await registry().verifyAll(NOW)).map((v) => v.key)).toEqual(['booking_confirmation', 'teacher_lesson_v2']);
  });

  it('a chat read that fails leaves chat rows as they are and imports nothing; notifications still sync', async () => {
    chat.getTemplates.mockRejectedValue(new WaError('(#190) Invalid OAuth access token', { code: 190, status: 401 }));
    await expect(registry().verifyAll(NOW)).resolves.toHaveLength(2);
    expect(patched('booking_confirmation')).toHaveLength(1);
    expect(patched('teacher_lesson_v2')).toEqual([]);
    expect(queries.insert).not.toHaveBeenCalled();
  });

  it('one line: the chat list is never read, nothing is imported, a chat row is checked against notifications', async () => {
    chat.configured.mockReturnValue(false);
    await registry().verifyAll(NOW);
    expect(chat.getTemplates).not.toHaveBeenCalled();
    expect(queries.insert).not.toHaveBeenCalled();
    expect(patched('teacher_lesson_v2')).toEqual([expect.objectContaining({ status: 'missing' })]);
  });

  it('a chat template is never submitted (it would go to the notifications WABA): 409 not_submittable', async () => {
    queries.get.mockResolvedValue({ ...RENEWAL_DUE_SEED, line: 'chat' });
    expect(await status(registry().submit('renewal_due', 'admin-1'))).toEqual([409, { code: 'not_submittable', message: 'not_submittable', status: 'not_submitted' }]);
    expect(notifications.submitTemplate).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
