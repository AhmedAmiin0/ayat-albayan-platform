import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, whatsappApp } from '@/modules/messaging/whatsapp/test-app';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// POST /messaging/templates «قالب جديد» (owner 2026-10-31): templates.manage, admins only, no Meta
// call.

type App = Awaited<ReturnType<typeof whatsappApp>>;
const CREATE_URL = '/messaging/templates';
const body = {
  key: 'welcome_back',
  line: 'chat',
  category: 'utility',
  body: 'Welcome back {{1}}.',
  params: [{ name: 'student_name', sample: 'Sara' }],
};

describe('POST /messaging/templates', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    const saved = (row: object): TemplateRow => ({ ...templateRow(), ...row });
    t.templates.create.mockImplementation(async (row: object) => saved(row));
  });

  it('201 with the new row (not submitted, on its line); audited; nothing sent to Meta', async () => {
    const res = await t.call({ method: 'POST', url: CREATE_URL, body });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ key: 'welcome_back', meta_name: 'welcome_back', line: 'chat', status: 'not_submitted' });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: ADMIN.id, action: 'template_created' }));
    expect(t.chatClient.submitTemplate).not.toHaveBeenCalled();
  });

  it('400 for a bad body; 409 invalid_template / template_exists', async () => {
    expect((await t.call({ method: 'POST', url: CREATE_URL, body: { ...body, key: 'Bad Key' } })).statusCode).toBe(400);
    const edge = await t.call({ method: 'POST', url: CREATE_URL, body: { ...body, body: '{{1}}' } });
    expect([edge.statusCode, edge.json().code]).toEqual([409, 'invalid_template']);
    t.templates.create.mockResolvedValueOnce(null);
    const taken = await t.call({ method: 'POST', url: CREATE_URL, body });
    expect([taken.statusCode, taken.json().code]).toEqual([409, 'template_exists']);
  });

  it('sales and teachers may not create one (403)', async () => {
    for (const token of ['sales', 'teacher']) {
      expect((await t.call({ method: 'POST', url: CREATE_URL, token, body })).statusCode).toBe(403);
    }
    expect(t.templates.create).not.toHaveBeenCalled();
  });
});
