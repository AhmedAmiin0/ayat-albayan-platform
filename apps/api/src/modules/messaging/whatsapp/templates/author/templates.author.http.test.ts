import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemResolver } from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { whatsappApp } from '@/modules/messaging/whatsapp/test-app';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// «القوالب» for sales (owner 2026-11-14): templates.author. The permission matrix, the chat
// line and the allow-list flag, the 5-a-day limit, and that none of it reaches templates.manage.
// No Meta call.

type App = Awaited<ReturnType<typeof whatsappApp>>;
const URL = '/messaging/templates/authored';
const body = {
  category: 'marketing',
  body: 'عرض خاص يا {{1}} لهذا الشهر',
  params: [{ name: 'var_1', sample: 'أحمد' }],
  buttons: [{ type: 'quick_reply', text: 'أريد التفاصيل' }],
};
const edit = { body: 'عرض جديد يا {{1}} هذا الأسبوع', params: [{ name: 'var_1', sample: 'أحمد' }] };
/** The roles matrix as an admin set it: templates.author granted to the classroom assistant's
 * role, and taken from the custom (sales-based) role. */
const granted = async (user: AuthUser) => {
  const seeded = await systemResolver(user);
  const grants: Record<string, typeof seeded> = {
    assistant: [...seeded, 'templates.author'],
    custom: seeded.filter((p) => p !== 'templates.author'),
  };
  return grants[user.id.endsWith('5') ? 'custom' : (user.role ?? '')] ?? seeded;
};
/** Meta's list after the call: the template under review. */
const pending = (name: string) => ({
  id: 'm-1', name, language: 'ar', status: 'PENDING', category: 'MARKETING', quality: null,
  components: [], rejectedReason: null,
});

describe('templates.author routes', () => {
  let t: App;
  const rows = new Map<string, TemplateRow>();
  beforeAll(async () => {
    t = await whatsappApp(granted);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    rows.clear();
    t.authored.createdSince.mockResolvedValue(0);
    t.chatClient.configured.mockReturnValue(true);
    t.chatClient.submitTemplate.mockResolvedValue({ metaId: 'm-1', status: 'PENDING' });
    t.chatClient.getTemplates.mockImplementation(async () => [...rows.keys()].map(pending));
    t.templates.all.mockImplementation(async () => [...rows.values()]);
    t.templates.get.mockImplementation(async (key: string) => rows.get(key) ?? null);
    t.templates.create.mockImplementation(async (row: TemplateRow) => {
      rows.set(row.key, { ...templateRow(), ...row });
      return rows.get(row.key);
    });
    t.templates.update.mockImplementation(async (key: string, patch: object) => {
      const row = rows.get(key);
      if (row) rows.set(key, { ...row, ...patch });
      return rows.get(key) ?? null;
    });
  });

  it('sales create: straight to Meta on the CHAT line, flagged, created_by; «قيد المراجعة»', async () => {
    const res = await t.call({ method: 'POST', url: URL, token: 'sales', body });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ line: 'chat', sales_starter: true, status: 'pending' });
    expect(t.templates.create).toHaveBeenCalledWith(expect.objectContaining({
      line: 'chat', sales_starter: true, created_by: 's0000000-0000-4000-8000-000000000003',
    }));
    expect(t.chatClient.submitTemplate).toHaveBeenCalledTimes(1);
    expect(t.client.submitTemplate).not.toHaveBeenCalled();
    const actions = t.audit.record.mock.calls.map((c) => (c[0] as { action: string }).action);
    expect(actions).toEqual(['template_authored', 'template_submitted']);
  });

  it('at most 5 new templates a day (429, in MSA)', async () => {
    t.authored.createdSince.mockResolvedValue(5);
    const res = await t.call({ method: 'POST', url: URL, token: 'sales', body });
    expect([res.statusCode, res.json().code]).toEqual([429, 'author_daily_limit']);
    expect(res.json().message_ar).toContain('5');
    expect(t.templates.create).not.toHaveBeenCalled();
  });

  it('the matrix: admin and sales by default, a granted assistant; never a teacher or a revoked role', async () => {
    for (const token of ['admin', 'sales', 'assistant']) {
      expect([token, (await t.call({ method: 'GET', url: URL, token })).statusCode]).toEqual([token, 200]);
    }
    for (const token of ['teacher', 'custom']) {
      expect([token, (await t.call({ method: 'GET', url: URL, token })).statusCode]).toEqual([token, 403]);
    }
  });

  it('the list: the chat allow-list and the user\'s own, nothing else', async () => {
    rows.set('a', templateRow({ key: 'a', line: 'chat', sales_starter: true, status: 'rejected', last_error: 'x' }));
    rows.set('b', templateRow({ key: 'b', line: 'notifications', sales_starter: false }));
    rows.set('c', templateRow({ key: 'c', line: 'chat', created_by: 's0000000-0000-4000-8000-000000000003' }));
    const res = await t.call({ method: 'GET', url: URL, token: 'sales' });
    expect(res.json().map((v: { key: string }) => v.key)).toEqual(['a', 'c']);
    expect(res.json()[0]).toMatchObject({ status: 'rejected', last_error: 'x' });
  });

  it('sales edit only an allow-list template the code does not send', async () => {
    rows.set('offer', templateRow({ key: 'offer', meta_name: 'offer', line: 'chat', sales_starter: true, meta_id: '9', buttons: [] }));
    t.chatClient.editTemplate.mockResolvedValue({ status: 'PENDING' });
    const ok = await t.call({ method: 'PATCH', url: `${URL}/offer`, token: 'sales', body: edit });
    expect([ok.statusCode, ok.json().status]).toEqual([200, 'pending']);
    expect(t.chatClient.editTemplate).toHaveBeenCalledTimes(1);
    rows.set('lesson_reminder', templateRow({ key: 'lesson_reminder', line: 'chat', sales_starter: true }));
    rows.set('other', templateRow({ key: 'other', line: 'chat', sales_starter: false }));
    for (const key of ['lesson_reminder', 'other']) {
      const res = await t.call({ method: 'PATCH', url: `${URL}/${key}`, token: 'sales', body: edit });
      expect([key, res.statusCode, res.json().code]).toEqual([key, 403, 'not_author_editable']);
    }
  });

  it('an author adds no link and no button action (400); an intent is dropped', async () => {
    rows.set('offer', templateRow({ key: 'offer', meta_name: 'offer', line: 'chat', sales_starter: true, meta_id: '9', buttons: [] }));
    const link = { type: 'url', text: 'افتح', url: 'https://example.org' };
    const url = await t.call({ method: 'PATCH', url: `${URL}/offer`, token: 'sales', body: { ...edit, buttons: [link] } });
    expect(url.statusCode).toBe(400);
    t.chatClient.editTemplate.mockResolvedValue({ status: 'PENDING' });
    const stop = { ...edit, buttons: [{ type: 'quick_reply', text: 'إيقاف', intent: 'stop' }] };
    expect((await t.call({ method: 'PATCH', url: `${URL}/offer`, token: 'sales', body: stop })).statusCode).toBe(200);
    expect(rows.get('offer')?.buttons).toEqual([]);
  });

  it('never reaches a templates.manage route', async () => {
    rows.set('offer', templateRow({ key: 'offer', line: 'chat', sales_starter: true, meta_id: '9' }));
    const routes = [
      { method: 'PATCH' as const, url: '/messaging/templates/offer/content', body: edit },
      { method: 'POST' as const, url: '/messaging/templates/offer/submit' },
      { method: 'PATCH' as const, url: '/messaging/templates/offer/starter', body: { sales_starter: true } },
      { method: 'POST' as const, url: '/messaging/templates', body: { ...body, key: 'x', line: 'chat' } },
    ];
    for (const r of routes) {
      for (const token of ['sales', 'assistant']) {
        const res = await t.call({ ...r, token });
        expect([r.url, token, res.statusCode]).toEqual([r.url, token, 403]);
      }
    }
    expect(t.chatClient.editTemplate).not.toHaveBeenCalled();
  });
});
