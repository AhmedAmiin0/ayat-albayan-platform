import { CrmWhatsappClient } from '@/modules/messaging/whatsapp/drivers/crm/crm.client';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import type { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { RelayLineNow } from './relay.line';
import type { RelayIds, RelayRowInput } from './relay.repo';

// Test-only (excluded from the build). The relay's notifications line on fake CRM answers
// (crm.fakes.ts) and an in-memory messages table. Phones and ids invented; no network.

export const TO = '+966500000001';
export const KEY = `Bearer ${CRM_ENV.apiKey}`;

/** The CRM's GET /me 200 for a key of `account` (its shape, as tools/wa-stub serves it). */
export const crmMe = (account = 'acct-1', scopes = ['messages:send']) => ({
  status: 200,
  body: { data: { account: { id: account, name: 'Academy' }, key: { id: 'key-1', scopes } } },
});

/** The line with the REAL crm driver over scripted CRM answers. */
export function fakeLine(input: {
  fetch: ReturnType<typeof scriptedFetch>;
  allowed?: readonly string[];
}) {
  const client = new CrmWhatsappClient(CRM_ENV, {
    fetch: input.fetch.fetch,
    timeoutMs: 1_000,
    allowed: input.allowed ?? null,
  });
  const now: RelayLineNow = { env: CRM_ENV, client, numberId: undefined, fetch: input.fetch.fetch };
  return { current: (): RelayLineNow | null => now };
}

interface FakeRow extends RelayRowInput {
  id: string;
  status: string;
  waMessageId: string | null;
  errorCode: string | null;
}

/** RelayRepo in memory: dedup_key unique, like the table. */
export function fakeRepo() {
  const rows: FakeRow[] = [];
  const find = (id: string) => rows.find((r) => r.id === id);
  return {
    rows,
    insert: async (input: RelayRowInput): Promise<RelayIds | null> => {
      if (rows.some((r) => r.dedupKey === input.dedupKey)) return null;
      const id = `row-${rows.length + 1}`;
      rows.push({ ...input, id, status: 'queued', waMessageId: null, errorCode: 'sending' });
      return { id, waMessageId: null };
    },
    byDedupKey: async (key: string): Promise<RelayIds | null> => {
      const row = rows.find((r) => r.dedupKey === key);
      return row ? { id: row.id, waMessageId: row.waMessageId } : null;
    },
    sent: async (input: { id: string; waMessageId: string | null }) => {
      Object.assign(find(input.id) ?? {}, {
        status: 'sent',
        waMessageId: input.waMessageId,
        errorCode: null,
      });
    },
    uncertain: async (input: { id: string }) => {
      Object.assign(find(input.id) ?? {}, { status: 'failed', errorCode: 'uncertain' });
    },
    drop: async (id: string) => {
      rows.splice(
        rows.findIndex((r) => r.id === id),
        1,
      );
    },
  };
}

export const templateBody = (to = '966500000001') => ({
  to,
  type: 'template',
  name: 'ولي أمر',
  template: {
    name: 'teacher_lesson_reminder',
    language: 'ar',
    params: { body: ['سارة', '17:00'], buttonParams: { '0': 'room-1' } },
  },
});
