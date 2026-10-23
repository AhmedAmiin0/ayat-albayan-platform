// HTTP test harness for /admin/notifications and the /settings alias (test-only, excluded from the
// build): the real controllers, guards, policy, writer and settings bridge; the settings store is a
// stateful fake, the rules table an in-memory map, the gate / templates / audit / activity mocks.
import { publicSettings, SETTING_DEFAULTS, systemPermissionsOf, type AcademySettings, type LineHealthView, type NotificationRuleRow } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { ActivityWriter } from '../../common/activity/activity.writer';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { PermissionResolver } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { SETTINGS_CACHE_MS, SettingsService } from '../../common/settings/settings.service';
import { SendGate } from '../whatsapp/send-gate';
import { RulesQueries } from './rules.queries';
import { RulesTable, type RuleRowWrite } from './rules.table';

export const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';
const LITE_ID = 'l0000000-0000-4000-8000-000000000004';
export const NUMBER_ID = 'b0000000-0000-4000-8000-000000000001';
const USERS: Record<string, AuthUser> = {
  admin: { id: ADMIN_ID, email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
  sales: { id: 's0000000-0000-4000-8000-000000000003', email: null, role: 'sales' },
  // An admin-like custom role holding settings.read/write but not notifications.manage.
  lite: { id: LITE_ID, email: null, role: 'admin' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const resolver: PermissionResolver = async (user) =>
  user.id === LITE_ID ? systemPermissionsOf('admin').filter((p) => p !== 'notifications.manage') : systemResolver(user);

/** A SettingsService that keeps what is written (null removes, like the real one). */
function statefulSettings(state: Partial<AcademySettings>) {
  const all = vi.fn(async (): Promise<AcademySettings> => ({ ...SETTING_DEFAULTS, ...state }));
  const write = vi.fn(async (values: Partial<AcademySettings>) => {
    Object.assign(state, values);
  });
  return { all, write, invalidate: vi.fn(), publicView: vi.fn(async () => publicSettings(await all())) };
}

/** RulesTable over a map; `fail` makes every read throw (fail-closed paths). */
function memoryTable() {
  const rows = new Map<string, NotificationRuleRow>();
  const t = {
    rows,
    fail: false,
    numbers: new Set<string>([NUMBER_ID]),
    read: vi.fn(async () => {
      if (t.fail) throw new Error('notification_rules read failed');
      return [...rows.values()];
    }),
    upsert: vi.fn(async (row: RuleRowWrite, actorId: string) => {
      rows.set(row.key, { ...row, updated_at: '2026-10-24T00:00:00Z', updated_by: actorId });
    }),
  };
  const fake = { rows: t.read, upsert: t.upsert, numberExists: vi.fn(async (id: string) => t.numbers.has(id)) };
  return { t, fake };
}

type GateState = { open: boolean; reason: 'not_configured' | 'switch_off' | null };

export async function rulesApp(initial: Partial<AcademySettings> = {}) {
  const state: Partial<AcademySettings> = { ...initial };
  const table = memoryTable();
  const m = {
    state,
    table: table.t,
    settings: statefulSettings(state),
    gate: { state: vi.fn(async (): Promise<GateState> => ({ open: false, reason: 'switch_off' })), open: vi.fn(async () => false) },
    queries: {
      templates: vi.fn(async () => new Map()),
      lines: vi.fn(async (): Promise<LineHealthView[]> => []),
      reach: vi.fn(async () => ({ guardian: 2, teacher: 1, lead: 4 })),
      classroom: vi.fn(() => true),
    },
    audit: { record: vi.fn(async () => undefined) },
    activity: { push: vi.fn(), flush: vi.fn(async () => undefined), onModuleDestroy: vi.fn(async () => undefined) },
  };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SettingsService).useValue(m.settings)
    .overrideProvider(SETTINGS_CACHE_MS).useValue(0)
    .overrideProvider(SendGate).useValue(m.gate)
    .overrideProvider(RulesQueries).useValue(m.queries)
    .overrideProvider(RulesTable).useValue(table.fake)
    .overrideProvider(AuditService).useValue(m.audit)
    .overrideProvider(ActivityWriter).useValue(m.activity)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const get = (url: string, opts: { token?: string; client?: string } = {}) =>
    app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${opts.token ?? 'admin'}`, ...(opts.client ? { 'x-ab-client': opts.client } : {}) },
    });
  const patch = (url: string, body: object, token = 'admin') =>
    app.inject({ method: 'PATCH', url, payload: body, headers: { authorization: `Bearer ${token}`, 'x-ab-client': 'web/test' } });
  /** The activity rows the rules wrote themselves (not the interceptor's per-request rows). */
  const essentialOffs = () => m.activity.push.mock.calls.map((c) => c[0] as { action: string }).filter((r) => r.action === 'notification_essential_off');
  /** Back to an empty settings store (every key reads its default). */
  const resetState = () => {
    for (const k of Object.keys(state)) Reflect.deleteProperty(state, k);
  };
  return { ...m, app, get, patch, essentialOffs, resetState };
}
