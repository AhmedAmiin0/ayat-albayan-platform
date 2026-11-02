import type { PushTransport } from './expo-deliver';
import { batchesOf, expoHttp } from './expo-http';
import { EXPO_PUSH_PATH, ticketsSchema, type ExpoTicket } from './expo-push';

// The Expo push send (docs/36 h6), on the Expo profile of the one outbound client (h2).

/** Expo's batch limit per request. */
const EXPO_BATCH = 100;

export interface ExpoConn {
  /** EXPO_API_BASE; unset = push off. */
  base: string | undefined;
  accessToken: string | undefined;
}

/** EXPO_API_BASE unset (local, e2e): an error ticket per message, nothing leaves the server. */
const PUSH_OFF: PushTransport = (messages) =>
  Promise.resolve(
    messages.map(() => ({ status: 'error' as const, message: 'push off: EXPO_API_BASE is not set' })),
  );

/**
 * POST the messages in batches of 100, one after the other, with EXPO_ACCESS_TOKEN when set; one
 * ticket per message, in order. A non-2xx throws «expo push HTTP <status>» (PushService logs it).
 */
export function expoTransport({ base, accessToken }: ExpoConn): PushTransport {
  if (!base) return PUSH_OFF;
  const http = expoHttp({ base, accessToken, label: 'expo push' });
  return async (messages) => {
    const tickets: ExpoTicket[] = [];
    for (const batch of batchesOf(messages, EXPO_BATCH)) {
      const call = { path: EXPO_PUSH_PATH, method: 'POST', json: batch } as const;
      tickets.push(...(await http.json({ ...call, schema: ticketsSchema })));
    }
    return tickets;
  };
}
