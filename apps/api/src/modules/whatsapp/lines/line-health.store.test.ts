import type { LineCheckView } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../../guardians/fake-db';
import { currentRows, displayE164, healthRows, LineHealthStore } from './line-health.store';

const view = (patch: Partial<LineCheckView>): LineCheckView => ({
  line: 'notifications',
  configured: true,
  provider: 'meta',
  gaps: [],
  duplicate_chat_phone: false,
  phone_number_id: 'p',
  waba_id: 'w',
  app_id: null,
  display_phone_number: '+966 55 123 4567',
  verified_name: 'أكاديمية آيات البيان',
  quality_rating: 'GREEN',
  status: 'CONNECTED',
  name_status: null,
  code_verification_status: null,
  subscribed_apps: [],
  errors: [],
  checked_at: '2026-10-22T08:00:00.000Z',
  ...patch,
});

describe('displayE164: Meta’s display number as E.164', () => {
  it.each([
    ['+966 55 123 4567', '+966551234567'],
    ['+20 100 123 4567', '+201001234567'],
    ['1 555-000-1234', '+15550001234'],
    [null, null],
    ['', null],
    ['12', null],
  ])('%s → %s', (input, out) => {
    expect(displayE164(input)).toBe(out);
  });
});

describe('healthRows: only a configured line that answered with a number', () => {
  it('keeps the number, name and time; drops failed and unconfigured lines (the previous good row stays)', () => {
    const rows = healthRows([
      view({}),
      view({ line: 'chat', display_phone_number: null, errors: [{ step: 'phone', code: 190, message: 'expired' }] }),
      view({ line: 'chat', configured: false }),
    ]);
    expect(rows).toEqual([
      { line: 'notifications', display_phone_e164: '+966551234567', verified_name: 'أكاديمية آيات البيان', checked_at: '2026-10-22T08:00:00.000Z', phone_number_id: 'p' },
    ]);
  });
});

describe('LineHealthStore', () => {
  it('upserts by line; nothing to keep → no write', async () => {
    const { db, calls, argsOf } = fakeDb({ wa_line_health: [{}] });
    const store = new LineHealthStore(db);
    await store.save([view({ configured: false })]);
    expect(calls).toEqual([]);
    await store.save([view({})]);
    expect(argsOf('wa_line_health', 'upsert')?.[1]).toEqual({ onConflict: 'line' });
  });

  it('a failed write is logged, never thrown (the check still answers)', async () => {
    const { db } = fakeDb({ wa_line_health: [{ error: { message: 'down' } }] });
    await expect(new LineHealthStore(db).save([view({})])).resolves.toBeUndefined();
  });

  afterEach(() => vi.unstubAllEnvs());

  it('all() reads the kept rows of the lines\' current phone ids; a read error throws', async () => {
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', 'chat-1');
    const row = { line: 'chat', display_phone_e164: '+201001234567', verified_name: null, checked_at: '2026-10-22T08:00:00Z' };
    const { db } = fakeDb({ wa_line_health: [{ data: [{ ...row, phone_number_id: 'chat-1' }] }, { error: { message: 'x' } }] });
    const store = new LineHealthStore(db);
    await expect(store.all()).resolves.toEqual([row]);
    await expect(store.all()).rejects.toThrow('line health read failed');
  });
});

describe('currentRows (#134 item 9): the kept number belongs to the phone id it checked', () => {
  const row = { line: 'notifications' as const, display_phone_e164: '+15550001111', verified_name: null, checked_at: '2026-10-22T08:00:00Z' };

  it('shows a row whose phone id is still the line\'s', () => {
    expect(currentRows([{ ...row, phone_number_id: 'p1' }], { notifications: 'p1' })).toEqual([row]);
  });

  it('hides it once the line was swapped to another phone id, or the line has none', () => {
    expect(currentRows([{ ...row, phone_number_id: 'p1' }], { notifications: 'p2' })).toEqual([]);
    expect(currentRows([{ ...row, phone_number_id: 'p1' }], {})).toEqual([]);
  });

  it('hides a row kept before the column existed (null phone id) until the next check', () => {
    expect(currentRows([{ ...row, phone_number_id: null }], { notifications: 'p1' })).toEqual([]);
  });
});
