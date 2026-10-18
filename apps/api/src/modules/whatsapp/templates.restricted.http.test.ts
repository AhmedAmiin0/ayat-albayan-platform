import { systemPermissionsOf, type Permission } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionResolver } from '../../common/auth/permissions';
import { whatsappApp } from './test-app';
import { REPORT_READY, templateRow } from './whatsapp.fakes';

type App = Awaited<ReturnType<typeof whatsappApp>>;
const keys = (rows: { key: string }[]) => rows.map((r) => r.key);

// Owner 2026-10-12: «all roles except the ones allowed to have all templates» list only the allow-list.
const ROWS = [
  templateRow(),
  templateRow({ key: 'lesson_reminder' }),
  templateRow({ key: 'free_trial_invite', meta_name: 'free_trial_invite', line: 'chat', sales_starter: true }),
  templateRow({ key: 'welcome_greeting', meta_name: 'welcome_greeting', line: 'chat', sales_starter: true }),
  templateRow({ key: 'lesson_join_link', sales_starter: true }),
  { ...REPORT_READY, status: 'approved' as const, sales_starter: true },
];
const TWO = ['free_trial_invite', 'welcome_greeting'];

/** The classroom assistant granted messages.read; the custom role (base sales) and the teacher get customGrants. */
let customGrants: Permission[] = [];
const resolver: PermissionResolver = async (user) => {
  if (!user.role) return [];
  const base = systemPermissionsOf(user.role);
  if (user.role === 'assistant') return [...base, 'messages.read'];
  return user.id.endsWith('5') || user.role === 'teacher' ? [...base, ...customGrants] : base;
};

describe('GET /messaging/templates per role (restricted allow-list)', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp(resolver);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    customGrants = [];
    t.templates.all.mockResolvedValue(ROWS);
  });
  const list = async (token: string) => keys((await t.call({ method: 'GET', url: '/messaging/templates', token })).json());

  it('the admin (templates.manage) lists every template', async () => {
    expect(await list('admin')).toHaveLength(ROWS.length);
  });

  // Owner 2026-10-18: «dont show all these templates to sales/teacher», whatever the teacher holds.
  it('a teacher granted both keys still lists only the two', async () => {
    customGrants = ['templates.send_all', 'templates.manage'];
    expect(await list('teacher')).toEqual(TWO);
  });

  // Owner 2026-10-15: «only allowed templates should be listed to the assistants», whatever they hold.
  it('a custom role based on sales granted both keys still lists only the two', async () => {
    customGrants = ['templates.send_all', 'templates.manage'];
    expect(await list('custom')).toEqual(TWO);
  });

  it.each(['teacher', 'sales', 'assistant'])('%s lists only free_trial_invite and welcome_greeting', async (token) => {
    expect(await list(token)).toEqual(TWO);
  });

  it('a custom role without templates.send_all lists only the two as well', async () => {
    expect(await list('custom')).toEqual(TWO);
  });

  it('the list follows the admin’s flags: none flagged → an empty list, never a fallback', async () => {
    t.templates.all.mockResolvedValue(ROWS.map((r) => ({ ...r, sales_starter: false })));
    expect(await list('teacher')).toEqual([]);
    expect(await list('admin')).toHaveLength(ROWS.length);
  });
});
