import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../audit/audit.service';
import { TOKEN_VERIFIER, type TokenVerifier } from '../auth/auth.guard';
import type { AuthUser } from '../auth/verify-token';
import { SettingsService } from './settings.service';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const settings = { lateCancelHours: vi.fn(), bookingHorizonWeeks: vi.fn(), write: vi.fn() };
const audit = { record: vi.fn() };

describe('GET/PATCH /settings — late-cancel hours and horizon (R-SCH-07, R-SCH-02)', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'PATCH', token = 'admin', payload?: object) =>
    app.inject({ method, url: '/settings', payload, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SettingsService).useValue(settings)
      .overrideProvider(AuditService).useValue(audit)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    settings.lateCancelHours.mockResolvedValue(null);
    settings.bookingHorizonWeeks.mockResolvedValue(5);
  });

  it('admins read them; late-cancel is OFF (null) by default; teachers get 403', async () => {
    expect((await call('GET')).json()).toEqual({ late_cancel_hours: null, booking_horizon_weeks: 5 });
    expect((await call('GET', 'teacher')).statusCode).toBe(403);
  });

  it('PATCH writes only the given keys and audits before/after', async () => {
    settings.lateCancelHours.mockResolvedValueOnce(null).mockResolvedValue(24);
    const res = await call('PATCH', 'admin', { lateCancelHours: 24 });
    expect(res.json()).toEqual({ late_cancel_hours: 24, booking_horizon_weeks: 5 });
    expect(settings.write).toHaveBeenCalledWith({ late_cancel_hours: 24 }, USERS['admin']?.id);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'settings', before: { late_cancel_hours: null, booking_horizon_weeks: 5 } }),
    );
  });

  it('null turns the policy back OFF; out-of-range values → 400', async () => {
    await call('PATCH', 'admin', { lateCancelHours: null });
    expect(settings.write).toHaveBeenCalledWith({ late_cancel_hours: null }, expect.any(String));
    expect((await call('PATCH', 'admin', { bookingHorizonWeeks: 13 })).statusCode).toBe(400);
    expect((await call('PATCH', 'admin', { lateCancelHours: 0 })).statusCode).toBe(400);
  });
});
