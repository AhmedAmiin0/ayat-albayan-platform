import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, whatsappApp } from '@/modules/messaging/whatsapp/test-app';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// PATCH /messaging/templates/:key/content «تعديل» (owner 2026-11-14): the admin, through the line's
// driver, audited like the submit; code-bound words only; Meta's limits. Fakes, no network.

type App = Awaited<ReturnType<typeof whatsappApp>>;
const url = (key: string) => `/messaging/templates/${key}/content`;
const words = {
  body: 'حُجزت حلقة {{1}} في {{2}} بإذن الله',
  params: [{ name: 'a', sample: 'سارة' }, { name: 'b', sample: 'الأحد' }],
  buttons: [{ type: 'url', text: 'ادخل', url: 'https://meet.jit.si/{{1}}' }],
};

describe('PATCH /messaging/templates/:key/content', () => {
  let t: App;
  let row: TemplateRow;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    row = templateRow({ status: 'approved', meta_id: '77' });
    t.client.configured.mockReturnValue(true);
    t.client.getTemplates.mockImplementation(async () => [{
      id: '77', name: row.meta_name, language: 'ar', status: 'PENDING', category: 'UTILITY', quality: null,
      components: [{ type: 'BODY', text: row.body_ar }], rejectedReason: null,
    }]);
    t.client.editTemplate.mockResolvedValue({ status: 'PENDING' });
    t.templates.all.mockImplementation(async () => [row]);
    t.templates.get.mockImplementation(async () => row);
    t.templates.update.mockImplementation(async (_key: string, patch: object) => {
      row = { ...row, ...patch };
      return row;
    });
  });

  it('edits a code-bound template\'s words on its own line: pending, counted, audited', async () => {
    const res = await t.call({ method: 'PATCH', url: url('booking_confirmation'), body: words });
    expect([res.statusCode, res.json().status]).toEqual([200, 'pending']);
    expect(t.client.editTemplate).toHaveBeenCalledWith(expect.objectContaining({ meta_id: '77' }), { headerHandle: undefined });
    expect(t.chatClient.editTemplate).not.toHaveBeenCalled();
    expect(row.approved_edits).toHaveLength(1);
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: ADMIN.id, action: 'template_edited',
      after: expect.objectContaining({ route: 'meta', by: 'admin', status: 'pending' }),
    }));
  });

  it('refuses another variable count or other buttons with an MSA reason; no Meta call', async () => {
    const more = { ...words, body: 'حلقة {{1}} في {{2}} مع {{3}} اليوم', params: [...words.params, { name: 'c', sample: 'x' }] };
    const res = await t.call({ method: 'PATCH', url: url('booking_confirmation'), body: more });
    expect([res.statusCode, res.json().code]).toEqual([409, 'code_bound_variables']);
    expect(res.json().message_ar).toMatch(/المتغيّرات/);
    const noButton = await t.call({ method: 'PATCH', url: url('booking_confirmation'), body: { ...words, buttons: [] } });
    expect(noButton.json().code).toBe('code_bound_buttons');
    expect(t.client.editTemplate).not.toHaveBeenCalled();
  });

  it("Meta's daily limit: 409 with when the next edit opens", async () => {
    row = templateRow({ status: 'approved', meta_id: '77', approved_edits: [new Date().toISOString()] });
    const res = await t.call({ method: 'PATCH', url: url('booking_confirmation'), body: words });
    expect([res.statusCode, res.json().code]).toEqual([409, 'edit_daily_limit']);
    expect(res.json().next_at).toEqual(expect.any(String));
  });

  it('409 edit_conflict when the row moved meanwhile; nothing audited', async () => {
    t.templates.update.mockResolvedValueOnce(null);
    const res = await t.call({ method: 'PATCH', url: url('booking_confirmation'), body: words });
    expect([res.statusCode, res.json().code]).toEqual([409, 'edit_conflict']);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('a teacher or sales gets 403', async () => {
    for (const token of ['teacher', 'sales']) {
      expect((await t.call({ method: 'PATCH', url: url('booking_confirmation'), token, body: words })).statusCode).toBe(403);
    }
  });
});
