import { systemPermissionsOf } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionResolver } from '../../../../common/auth/permissions';
import { whatsappApp } from '../../test-app';
import { templateRow } from '../../whatsapp.fakes';

type App = Awaited<ReturnType<typeof whatsappApp>>;

// Templates per number over HTTP (owner 2026-10-18): one line's sync by body or query, the lines view,
// the move, and every manage route closed to an allow-list-only role even when it holds templates.manage
// (staging's sales role held a stray one: POST health answered it every template, unfiltered).

/** Every role is granted templates.manage on top of its system permissions. */
const leaky: PermissionResolver = async (user) => (user.role ? [...systemPermissionsOf(user.role), 'templates.manage'] : []);
const MANAGE = [
  ['GET', '/messaging/templates/lines'],
  ['POST', '/messaging/templates/health'],
  ['POST', '/messaging/templates/trial_reschedule/submit'],
  ['PATCH', '/messaging/templates/trial_reschedule/line', { line: 'notifications' }],
  ['PATCH', '/messaging/templates/trial_reschedule/starter', { sales_starter: false }],
  ['POST', '/messaging/lines/check'],
] as const;

describe('templates per number (HTTP)', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp(leaky);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.client.configured.mockReturnValue(true);
    t.chatClient.configured.mockReturnValue(true);
    t.client.getTemplates.mockResolvedValue([]);
    t.chatClient.getTemplates.mockResolvedValue([]);
    t.templates.all.mockResolvedValue([templateRow(), templateRow({ key: 'trial_reschedule', meta_name: 'trial_reschedule', line: 'chat' })]);
  });

  it.each(['sales', 'assistant', 'teacher', 'custom'])('%s holding templates.manage: 403 allow_list_only on every manage route', async (token) => {
    for (const [method, url, body] of MANAGE) {
      const res = await t.call({ method, url, token, ...(body ? { body } : {}) });
      expect([url, res.statusCode, res.json().code]).toEqual([url, 403, 'allow_list_only']);
    }
    expect(t.client.getTemplates).not.toHaveBeenCalled();
    expect(t.templates.update).not.toHaveBeenCalled();
    expect(t.lines.check).not.toHaveBeenCalled();
  });

  it('POST health with {line:"chat"} (or ?line=chat) syncs the chat number only', async () => {
    for (const call of [{ body: { line: 'chat' } }, { url: '/messaging/templates/health?line=chat' }]) {
      const res = await t.call({ method: 'POST', url: '/messaging/templates/health', ...call });
      expect([res.statusCode, res.json().lines.map((l: { line: string }) => l.line)]).toEqual([200, ['chat']]);
    }
    expect(t.client.getTemplates).not.toHaveBeenCalled();
    expect(t.chatClient.getTemplates).toHaveBeenCalledTimes(2);
  });

  it('POST health with an unknown line is 400', async () => {
    expect((await t.call({ method: 'POST', url: '/messaging/templates/health', body: { line: 'sms' } })).statusCode).toBe(400);
  });

  it('GET lines: both numbers, notifications first', async () => {
    const res = await t.call({ method: 'GET', url: '/messaging/templates/lines' });
    expect([res.statusCode, res.json().map((l: { line: string }) => l.line)]).toEqual([200, ['notifications', 'chat']]);
  });

  it('PATCH line moves the template (audited) and answers its new line’s sync', async () => {
    t.templates.get.mockResolvedValue(templateRow({ key: 'trial_reschedule', meta_name: 'trial_reschedule', line: 'chat' }));
    t.templates.update.mockImplementation(async (key: string, patch: object) => ({ ...templateRow({ key }), ...patch }));
    const res = await t.call({ method: 'PATCH', url: '/messaging/templates/trial_reschedule/line', body: { line: 'notifications' } });
    expect([res.statusCode, res.json().sync.line]).toEqual([200, 'notifications']);
    expect(t.templates.update).toHaveBeenCalledWith('trial_reschedule', expect.objectContaining({ line: 'notifications', status: 'not_submitted' }));
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'template_line_set' }));
    expect((await t.call({ method: 'PATCH', url: '/messaging/templates/trial_reschedule/line', body: { line: 'x' } })).statusCode).toBe(400);
  });
});
