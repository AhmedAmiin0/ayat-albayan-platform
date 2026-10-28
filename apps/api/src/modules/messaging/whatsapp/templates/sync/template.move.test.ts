import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../../../common/audit/audit.service';
import { TemplateRegistry } from '../catalog/template.registry';
import type { TemplatesQueries } from '../catalog/templates.queries';
import { templateRow } from '../../whatsapp.fakes';
import type { MetaTemplate, TemplateRow, WhatsappLines } from '../../whatsapp.types';

// «نقل إلى الرقم الآخر» (owner 2026-10-18): the row moves, its old WABA's state is dropped, and the new
// line is synced at once, so the status follows the target WABA.

const db = new Map<string, TemplateRow>();
const queries = {
  all: vi.fn(async () => [...db.values()]),
  get: vi.fn(async (key: string) => db.get(key) ?? null),
  update: vi.fn(async (key: string, patch: Partial<TemplateRow>) => {
    const row = db.get(key);
    if (!row) return null;
    db.set(key, { ...row, ...patch });
    return db.get(key) ?? null;
  }),
  insert: vi.fn(async () => null),
  saveLineSync: vi.fn(async (s: { line: string }) => void synced.set(s.line, s)),
  lineSyncs: vi.fn(async () => new Map(synced)),
};
const synced = new Map<string, unknown>();
const client = () => ({ configured: vi.fn(() => true), getTemplates: vi.fn(async (): Promise<MetaTemplate[]> => []) });
let lines = { notifications: client(), chat: client() };
const audit = { record: vi.fn() };
const registry = () => new TemplateRegistry(queries as unknown as TemplatesQueries, lines as unknown as WhatsappLines, audit as unknown as AuditService);
const approvedOnMeta = (name: string): MetaTemplate => ({
  id: `chat-${name}`, name, language: 'ar', status: 'APPROVED', category: 'UTILITY', quality: 'GREEN', components: [], rejectedReason: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.clear();
  lines = { notifications: client(), chat: client() };
  db.set('booking_confirmation', templateRow({ status: 'approved', meta_id: 'notif-1', quality: 'GREEN' }));
});

describe('PATCH /messaging/templates/:key/line', () => {
  it('to a WABA that has it approved: approved there, with that WABA’s id; audited template_line_set', async () => {
    lines.chat.getTemplates.mockResolvedValue([approvedOnMeta('booking_confirmation')]);
    const { template, sync } = await registry().moveLine({ key: 'booking_confirmation', line: 'chat' }, 'admin-1');
    expect(template).toMatchObject({ line: 'chat', status: 'approved', meta_id: 'chat-booking_confirmation' });
    expect(sync).toMatchObject({ line: 'chat', ok: true, synced: 1 });
    expect(lines.notifications.getTemplates).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'template_line_set',
      before: { key: 'booking_confirmation', line: 'notifications', status: 'approved', meta_id: 'notif-1' },
      after: { key: 'booking_confirmation', line: 'chat', status: 'not_submitted' },
    }));
  });

  it('to a WABA without it: not_submitted (never missing), so the admin can submit it there', async () => {
    const { template } = await registry().moveLine({ key: 'booking_confirmation', line: 'chat' }, 'admin-1');
    expect(template).toMatchObject({ line: 'chat', status: 'not_submitted', meta_id: null, quality: null });
  });

  it('to a line that is not configured: moved and not_submitted, no sync', async () => {
    lines.chat.configured.mockReturnValue(false);
    const { template, sync } = await registry().moveLine({ key: 'booking_confirmation', line: 'chat' }, 'admin-1');
    expect([template.line, template.status, sync]).toEqual(['chat', 'not_submitted', null]);
    expect(lines.chat.getTemplates).not.toHaveBeenCalled();
  });

  it('the same line is a no-op (no write, no audit); an unknown key is 404', async () => {
    await expect(registry().moveLine({ key: 'booking_confirmation', line: 'notifications' }, 'a')).resolves.toMatchObject({ sync: null });
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    await expect(registry().moveLine({ key: 'nope', line: 'chat' }, 'a')).rejects.toMatchObject({ status: 404 });
  });

  it('the move’s sync is remembered as the line’s last sync', async () => {
    const r = registry();
    await r.moveLine({ key: 'booking_confirmation', line: 'chat' }, 'a');
    expect((await r.lineViews()).find((v) => v.line === 'chat')?.last_sync).toMatchObject({ ok: true });
  });
});
