import { systemPermissionsOf, type Permission } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionResolver } from '../../../common/auth/permissions';
import { templateRow } from '../../whatsapp/whatsapp.fakes';
import { PHONE } from '../inbox.fakes';
import { inboxApp } from '../test-app';

// Owner 2026-10-15: «only allowed templates should be listed to the assistants». A sales role edited in
// the database to hold templates.manage / templates.send_all still lists and sends only the allow-list.
const GRANTED: Permission[] = ['templates.manage', 'templates.send_all'];
const resolve: PermissionResolver = async (user) => {
  const base = user.role ? systemPermissionsOf(user.role) : [];
  return user.role === 'sales' ? [...base, ...GRANTED] : base;
};
const STARTER = templateRow({ key: 'free_trial_invite', meta_name: 'free_trial_invite', line: 'chat', sales_starter: true });
const OTHER = templateRow({ key: 'booking_confirmation' });

describe('assistants list and send only the allow-list, whatever they were granted', () => {
  let t: Awaited<ReturnType<typeof inboxApp>>;
  beforeAll(async () => {
    t = await inboxApp(resolve);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.templates.all.mockResolvedValue([STARTER, OTHER]);
    t.templates.get.mockResolvedValue(OTHER);
  });

  it('GET /messaging/templates: the allow-list for sales, every template for the admin', async () => {
    const sales = await t.call({ method: 'GET', url: '/messaging/templates', token: 'sales' });
    expect(sales.json().map((row: { key: string }) => row.key)).toEqual(['free_trial_invite']);
    const admin = await t.call({ method: 'GET', url: '/messaging/templates', token: 'admin' });
    expect(admin.json().map((row: { key: string }) => row.key)).toEqual(['free_trial_invite', 'booking_confirmation']);
  });

  it('a template off the list is 403 template_not_allowed for sales', async () => {
    const body = { key: 'booking_confirmation', params: { '1': 'أ', '2': 'ب', button: 'x' }, clientRequestId: 'c0000000-0000-4000-8000-000000000003' };
    const res = await t.call({ method: 'POST', url: `/threads/${encodeURIComponent(PHONE)}/template`, token: 'sales', body });
    expect([res.statusCode, res.json().code]).toEqual([403, 'template_not_allowed']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });
});
