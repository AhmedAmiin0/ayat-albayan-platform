import type { ExpoConn } from '@/common/push/push.module';
import { expoHttp } from '@/common/push/expo/expo-http';
import { receiptsSchema, type ExpoReceipt } from './push-receipts';

/** Under EXPO_API_BASE («https://exp.host»). */
const EXPO_RECEIPTS_PATH = '--/api/v2/push/getReceipts';
/** Expo's limit of ids per getReceipts request. */
const RECEIPTS_BATCH = 1000;

/** Receipts by ticket id; ids without a receipt yet are absent. Injectable so tests never fetch. */
export type ReceiptsTransport = (ids: readonly string[]) => Promise<Record<string, ExpoReceipt>>;
export const RECEIPTS_TRANSPORT = Symbol('RECEIPTS_TRANSPORT');

const batchesOf = (ids: readonly string[]): string[][] =>
  Array.from({ length: Math.ceil(ids.length / RECEIPTS_BATCH) }, (_, i) =>
    ids.slice(i * RECEIPTS_BATCH, (i + 1) * RECEIPTS_BATCH),
  );

/**
 * The real transport: POST the ids in batches of 1000 (one after the other), with
 * EXPO_ACCESS_TOKEN when set, 10 s each (new in h2: none before). EXPO_API_BASE unset (push off):
 * no receipts, nothing is fetched.
 */
export function expoReceiptsTransport({ base, accessToken }: ExpoConn): ReceiptsTransport {
  if (!base) return async () => ({});
  const http = expoHttp({ base, accessToken, label: 'expo receipts' });
  return async (ids) => {
    const out: Record<string, ExpoReceipt> = {};
    for (const batch of batchesOf(ids)) {
      const call = { path: EXPO_RECEIPTS_PATH, method: 'POST', json: { ids: batch } } as const;
      Object.assign(out, await http.json({ ...call, schema: receiptsSchema }));
    }
    return out;
  };
}
