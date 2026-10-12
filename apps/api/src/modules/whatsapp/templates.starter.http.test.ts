import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, whatsappApp } from './test-app';
import { templateRow } from './whatsapp.fakes';

// PATCH /messaging/templates/:key/starter «قالب بدء محادثة للمبيعات» (owner 2026-10-12, docs/16).

type App = Awaited<ReturnType<typeof whatsappApp>>;
const STARTER_URL = '/messaging/templates/academy_welcome/starter';
const welcome = templateRow({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', sales_starter: true });

describe('PATCH /messaging/templates/:key/starter', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.templates.get.mockResolvedValue(welcome);
    t.templates.update.mockImplementation(async (_key: string, patch: object) => ({ ...welcome, ...patch }));
  });

  it('the admin unticks a starter: 200 with the view (line + flag), audited', async () => {
    const res = await t.call({ method: 'PATCH', url: STARTER_URL, body: { sales_starter: false } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ key: 'academy_welcome', line: 'chat', sales_starter: false });
    expect(t.templates.update).toHaveBeenCalledWith('academy_welcome', { sales_starter: false });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: ADMIN.id, action: 'template_starter_set' }));
  });

  it('400 for a body without the flag; 404 template_not_found for an unknown key', async () => {
    expect((await t.call({ method: 'PATCH', url: STARTER_URL, body: { sales_starter: 'yes' } })).statusCode).toBe(400);
    t.templates.get.mockResolvedValue(null);
    const res = await t.call({ method: 'PATCH', url: '/messaging/templates/nope/starter', body: { sales_starter: true } });
    expect([res.statusCode, res.json().code]).toEqual([404, 'template_not_found']);
    expect(t.templates.update).not.toHaveBeenCalled();
  });

  it('sales and teachers may not flag a template (templates.manage)', async () => {
    for (const token of ['sales', 'teacher']) {
      expect((await t.call({ method: 'PATCH', url: STARTER_URL, token, body: { sales_starter: true } })).statusCode).toBe(403);
    }
    expect(t.templates.update).not.toHaveBeenCalled();
  });
});
