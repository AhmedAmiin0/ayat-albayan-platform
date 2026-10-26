import type { Db } from '../../../../common/db/db.module';
import { fakeDb, type FakeResult } from '../../../people/guardians/fake-db';
import { SendGate } from './send-gate';
import { WhatsappSettings } from '../whatsapp.settings';

// Test helper (not a test): a SendGate over a fake DB. Each `settings` result answers one uncached gate read.

/** WA_* env of the local stub: WhatsApp configured, so only the stored switches decide. */
export const STUB_WA_ENV = {
  WA_API_BASE: 'http://127.0.0.1:4010',
  WA_PHONE_NUMBER_ID: 'stub-phone',
  WA_WABA_ID: 'stub-waba',
  WA_ACCESS_TOKEN: 'stub-token',
} as const;

/** One `settings` read answering these stored rows. */
export const rows = (stored: Record<string, unknown>): FakeResult => ({
  data: Object.entries(stored).map(([key, value]) => ({ key, value })),
});

export function fakeGate(settings: FakeResult[], queued = 0) {
  const fake = fakeDb({ settings, messages: [{ count: queued }] });
  const db: Db = fake.db;
  return { gate: new SendGate(new WhatsappSettings(db), db), calls: fake.calls };
}
