// Test fakes for messages sent outside the app (not shipped behaviour). No network: Kapso is a vi.fn().
import type { TablesInsert } from '@ab/db';
import { vi } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '../../../../common/integrations/numbers-overlay';
import type { KapsoLineEnv } from '../../../../config/env/env';
import type { WebhookQueries } from '../webhook.queries';
import { ExternalStatus } from './external-status';
import type { ExternalQueries } from './external.queries';
import { ExternalStore } from './external.store';
import type { KapsoHistory } from './kapso-history';

export const KAPSO_PHONE_ID = 'kapso-chat-1';
export const KAPSO_NUMBER_ID = '00000000-0000-4000-8000-0000000000d1';
/** 2026-10-26 09:00:00 UTC in Meta's unix seconds. */
export const SENT_TS = '1793005200';
export const SENT_AT = new Date(Number(SENT_TS) * 1000);

export const kapsoEnv = (over: Partial<KapsoLineEnv> = {}): KapsoLineEnv => ({
  provider: 'kapso',
  base: 'http://localhost:4010/kapso',
  version: 'v24.0',
  phoneNumberId: KAPSO_PHONE_ID,
  wabaId: 'waba-1',
  apiKey: 'fake-kapso-key',
  ...over,
});

/** Module mode with one chat number on Kapso (enabled unless told otherwise). */
export function kapsoOverlay(over: Partial<OverlayNumber> = {}): void {
  const n: OverlayNumber = {
    ...{ id: KAPSO_NUMBER_ID, label: 'chat', purpose: 'chat', phone_number_id: KAPSO_PHONE_ID, waba_id: 'waba-1' },
    ...{ enabled: true, is_default: true, fallback_rank: 0, created_at: '2026-10-23T00:00:00Z', appSecret: null },
    env: kapsoEnv(),
    ...over,
  };
  setNumbersOverlay({ values: {}, numberIds: { chat: n.id }, numbers: [n] });
}

/** A text the staff sent from Kapso's inbox, as Kapso's history returns it. */
export function kapsoText(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'wamid.EXT1',
    type: 'text',
    timestamp: SENT_TS,
    to: '966501234567',
    text: { body: 'تم تأكيد الموعد' },
    kapso: { direction: 'outbound', status: 'delivered' },
    ...over,
  };
}

/** ExternalQueries over a shared in-memory messages list (the unique wa_message_id included). */
export function fakeExternalQueries(stored: TablesInsert<'messages'>[]) {
  return {
    existing: vi.fn(async (ids: readonly string[]) => new Set(stored.flatMap((r) => (r.wa_message_id && ids.includes(r.wa_message_id) ? [r.wa_message_id] : [])))),
    insert: vi.fn(async (row: TablesInsert<'messages'>) => {
      if (stored.some((r) => r.wa_message_id === row.wa_message_id)) return false;
      stored.push(row);
      return true;
    }),
    newestExternal: vi.fn().mockResolvedValue(null as Date | null),
    inFlight: vi.fn().mockResolvedValue(false),
  };
}

export const fakeKapso = () => ({
  message: vi.fn().mockResolvedValue(kapsoText() as unknown),
  outbound: vi.fn().mockResolvedValue({ messages: [] as unknown[], after: undefined as string | undefined }),
});

/** The real external services over the fakes; `queries` is fakeQueries() (identify, latestInSecond, numberIdFor). */
export function externalServices(queries: { stored: TablesInsert<'messages'>[] }) {
  const ext = fakeExternalQueries(queries.stored);
  const kapso = fakeKapso();
  const store = new ExternalStore(ext as unknown as ExternalQueries, queries as unknown as WebhookQueries);
  const status = new ExternalStatus(store, kapso as unknown as KapsoHistory);
  return { ext, kapso, store, status };
}
