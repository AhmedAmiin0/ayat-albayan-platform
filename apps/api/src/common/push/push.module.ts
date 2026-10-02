import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { EXPO_PUSH_PATH, type ExpoMessage, type ExpoTicket } from './expo-push';
import { PUSH_TRANSPORT, PushService, type PushTransport } from './push.service';

/** Expo's batch limit per request. */
const EXPO_BATCH = 100;

export interface ExpoConn {
  /** EXPO_API_BASE; unset = push off. */
  base: string | undefined;
  accessToken: string | undefined;
}

/** EXPO_API_BASE unset (local, e2e): every message gets an error ticket, nothing leaves the server. */
const PUSH_OFF: PushTransport = async (messages) =>
  messages.map(() => ({ status: 'error' as const, message: 'push off: EXPO_API_BASE is not set' }));

function expoTransport({ base, accessToken }: ExpoConn): PushTransport {
  if (!base) return PUSH_OFF;
  const url = `${base.replace(/\/+$/, '')}${EXPO_PUSH_PATH}`;
  return async (messages: ExpoMessage[]) => {
    const tickets: ExpoTicket[] = [];
    for (let i = 0; i < messages.length; i += EXPO_BATCH) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(messages.slice(i, i + EXPO_BATCH)),
      });
      if (!res.ok) throw new Error(`expo push HTTP ${res.status}`);
      tickets.push(...((await res.json()) as { data: ExpoTicket[] }).data);
    }
    return tickets;
  };
}

/** Global: the webhook, the sender and the jobs all inject PushService (docs/12 §6). */
@Global()
@Module({
  providers: [
    PushService,
    {
      provide: PUSH_TRANSPORT,
      useFactory: () => expoTransport({ base: loadEnv().EXPO_API_BASE, accessToken: loadEnv().EXPO_ACCESS_TOKEN }),
    },
  ],
  exports: [PushService],
})
export class PushModule {}
