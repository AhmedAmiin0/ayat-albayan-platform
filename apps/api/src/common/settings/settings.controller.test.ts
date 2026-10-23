import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../audit/singleton-entity';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../auth/auth.guard';
import type { AuthUser } from '../auth/verify-token';
import { CustomConfigService } from '../config/custom-config.service';
import { SettingsService } from './settings.service';
import { SETTING_DEFAULTS } from './settings.values';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const settings = { all: vi.fn(), write: vi.fn(), publicView: vi.fn() };
const custom = { publicRows: vi.fn() };
const audit = { record: vi.fn() };

describe('GET/PATCH /settings — late-cancel hours and horizon (R-SCH-07, R-SCH-02)', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'PATCH', token = 'admin', payload?: object) =>
    app.inject({ method, url: '/settings', payload, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SettingsService).useValue(settings)
      .overrideProvider(CustomConfigService).useValue(custom)
      .overrideProvider(AuditService).useValue(audit)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    settings.all.mockResolvedValue(SETTING_DEFAULTS);
    custom.publicRows.mockResolvedValue([]);
  });

  it('admins read them; late-cancel is OFF (null) by default; teachers get 403', async () => {
    expect((await call('GET')).json()).toEqual(SETTING_DEFAULTS);
    expect(SETTING_DEFAULTS.late_cancel_hours).toBeNull();
    expect((await call('GET', 'teacher')).statusCode).toBe(403);
  });

  it('PATCH writes only the given keys and audits before/after', async () => {
    const after = { ...SETTING_DEFAULTS, late_cancel_hours: 24 };
    settings.all.mockResolvedValueOnce(SETTING_DEFAULTS).mockResolvedValue(after);
    const res = await call('PATCH', 'admin', { lateCancelHours: 24 });
    expect(res.json()).toEqual(after);
    expect(settings.write).toHaveBeenCalledWith({ late_cancel_hours: 24 }, USERS['admin']?.id);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'settings', before: SETTING_DEFAULTS, after }),
    );
  });

  it('PATCH autoMessagesEnabled writes only auto_messages_enabled and audits before/after', async () => {
    const after = { ...SETTING_DEFAULTS, auto_messages_enabled: true };
    settings.all.mockResolvedValueOnce(SETTING_DEFAULTS).mockResolvedValue(after);
    expect((await call('PATCH', 'admin', { autoMessagesEnabled: true })).json()).toEqual(after);
    expect(settings.write).toHaveBeenCalledWith({ auto_messages_enabled: true }, USERS['admin']?.id);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'settings', entityId: SINGLETON_ENTITY_ID, action: 'update', before: SETTING_DEFAULTS, after }),
    );
    expect((await call('PATCH', 'teacher', { autoMessagesEnabled: true })).statusCode).toBe(403);
  });

  it('null turns the policy back OFF; out-of-range values → 400', async () => {
    await call('PATCH', 'admin', { lateCancelHours: null });
    expect(settings.write).toHaveBeenCalledWith({ late_cancel_hours: null }, expect.any(String));
    expect((await call('PATCH', 'admin', { bookingHorizonWeeks: 13 })).statusCode).toBe(400);
    expect((await call('PATCH', 'admin', { lateCancelHours: 0 })).statusCode).toBe(400);
  });

  it('Phase 3 keys (R-SUB-02, R-REP-02, R-RPT-02, R-PAY-02) map to their snake_case rows', async () => {
    const body = { renewalAlertRemaining: 3, payoutCountLate: true, reportingCurrency: 'EGP' };
    expect((await call('PATCH', 'admin', body)).statusCode).toBe(200);
    expect(settings.write).toHaveBeenCalledWith(
      { renewal_alert_remaining: 3, payout_count_late: true, reporting_currency: 'EGP' },
      USERS['admin']?.id,
    );
    expect((await call('PATCH', 'admin', { reportingCurrency: 'sar' })).statusCode).toBe(400);
    expect((await call('PATCH', 'admin', { reportTeacherEditHours: 169 })).statusCode).toBe(400);
  });

  it('GET /settings/public needs no login and returns only the public keys', async () => {
    settings.publicView.mockResolvedValue({ join_opens_before_min: 10 });
    const res = await app.inject({ method: 'GET', url: '/settings/public' });
    expect([res.statusCode, res.json()]).toEqual([200, { join_opens_before_min: 10, custom: {} }]);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });

  it('GET /settings/public adds the custom entries flagged public, never a private or shadowing row', async () => {
    settings.publicView.mockResolvedValue({ join_opens_before_min: 10 });
    custom.publicRows.mockResolvedValue([
      { key: 'promo', value: { text: 'hi' }, is_public: true },
      { key: 'internal.note', value: 'x', is_public: false },
      { key: 'messaging_enabled', value: 'shadow', is_public: true },
    ]);
    const res = await app.inject({ method: 'GET', url: '/settings/public' });
    expect(res.json()).toEqual({ join_opens_before_min: 10, custom: { promo: { text: 'hi' } } });
  });

  it('PATCH validates the new keys from the registry (E.164, min/max)', async () => {
    expect((await call('PATCH', 'admin', { academyWhatsappE164: '0566101447' })).statusCode).toBe(400);
    expect((await call('PATCH', 'admin', { joinOpensBeforeMin: 181 })).statusCode).toBe(400);
    expect((await call('PATCH', 'admin', { joinOpensBeforeMin: 30 })).statusCode).toBe(200);
    expect(settings.write).toHaveBeenCalledWith({ join_opens_before_min: 30 }, USERS['admin']?.id);
  });
});
