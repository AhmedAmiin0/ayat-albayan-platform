import { SETTING_DEFAULTS } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../auth/auth.guard';
import { SettingsService } from './settings.service';

const ADMIN = 'a0000000-0000-4000-8000-000000000001';
const verify: TokenVerifier = async (token) => {
  if (token !== 'admin') throw new Error('bad token');
  return { id: ADMIN, email: null, role: 'admin' };
};
const settings = { all: vi.fn(), write: vi.fn() };
const audit = { record: vi.fn() };

const OWNED_BODY = {
  messagingEnabled: true,
  autoMessagesEnabled: true,
  crmCutoverDone: true,
  commsSource: 'module',
  googleSyncEnabled: true,
  googleSyncMode: 'live',
  googleCalendarWindowDays: 30,
};
const OWNED_KEYS = [
  'messaging_enabled',
  'auto_messages_enabled',
  'crm_cutover_done',
  'comms_source',
  'google_sync_enabled',
  'google_sync_mode',
  'google_calendar_window_days',
];

// PATCH /settings per key (docs/26 §2f, 26-P0): owned keys come back in `moved` and are never written.
describe('PATCH /settings — owned keys are moved', () => {
  let app: NestFastifyApplication;
  const patch = (payload: unknown) =>
    app.inject({ method: 'PATCH', url: '/settings', payload: payload as object, headers: { authorization: 'Bearer admin', 'content-type': 'application/json' } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
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
    settings.all.mockResolvedValue(SETTING_DEFAULTS);
  });

  it('only owned keys (camelCase) → 200, saved: [], nothing written or audited', async () => {
    const res = await patch(OWNED_BODY);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ ...SETTING_DEFAULTS, saved: [], invalid: [] });
    expect([...body.moved].sort()).toEqual([...OWNED_KEYS].sort());
    expect(settings.write).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('the snake_case forms are moved too', async () => {
    const snake = Object.fromEntries(OWNED_KEYS.map((k) => [k, true]));
    const res = await patch(snake);
    expect(res.statusCode).toBe(200);
    expect([...res.json().moved].sort()).toEqual([...OWNED_KEYS].sort());
    expect(settings.write).not.toHaveBeenCalled();
  });

  it('a mix: the valid keys are saved, the owned ones moved', async () => {
    const res = await patch({ ...OWNED_BODY, bookingHorizonWeeks: 6, payoutCountLate: true, unknownField: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.json().saved).toEqual(['booking_horizon_weeks', 'payout_count_late']);
    expect(settings.write).toHaveBeenCalledExactlyOnceWith({ booking_horizon_weeks: 6, payout_count_late: true }, ADMIN);
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('invalid with nothing saved → 400 as before, even beside owned keys', async () => {
    const res = await patch({ messagingEnabled: true, bookingHorizonWeeks: 13 });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: 'bookingHorizonWeeks' }] });
    expect(settings.write).not.toHaveBeenCalled();
  });

  it('a non-object body → 400', async () => {
    for (const body of [[1, 2], 'x', 5]) expect((await patch(body)).statusCode).toBe(400);
    expect(settings.write).not.toHaveBeenCalled();
  });
});
