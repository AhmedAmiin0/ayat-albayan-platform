import type { ExpoConn } from '../../common/push/push.module';
import type { ExpoReceipt } from './push-receipts';

/** Under EXPO_API_BASE («https://exp.host»). */
export const EXPO_RECEIPTS_PATH = '/--/api/v2/push/getReceipts';
/** Expo's limit of ids per getReceipts request. */
export const RECEIPTS_BATCH = 1000;

/** Receipts by ticket id; ids without a receipt yet are absent. Injectable so tests never fetch. */
export type ReceiptsTransport = (ids: readonly string[]) => Promise<Record<string, ExpoReceipt>>;
export const RECEIPTS_TRANSPORT = Symbol('RECEIPTS_TRANSPORT');

/**
 * The real transport: POST the ids in batches of 1000, with EXPO_ACCESS_TOKEN when set.
 * EXPO_API_BASE unset (push off): no receipts, nothing is fetched.
 */
export function expoReceiptsTransport({ base, accessToken }: ExpoConn): ReceiptsTransport {
  if (!base) return async () => ({});
  const url = `${base.replace(/\/+$/, '')}${EXPO_RECEIPTS_PATH}`;
  return async (ids) => {
    const out: Record<string, ExpoReceipt> = {};
    for (let i = 0; i < ids.length; i += RECEIPTS_BATCH) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ ids: ids.slice(i, i + RECEIPTS_BATCH) }),
      });
      if (!res.ok) throw new Error(`expo receipts HTTP ${res.status}`);
      Object.assign(out, ((await res.json()) as { data?: Record<string, ExpoReceipt> }).data);
    }
    return out;
  };
}
