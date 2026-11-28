import type { PushTokenAnswer, PushTokenBody } from '@ab/shared';

export interface PushTokenCalls {
  add: (body: PushTokenBody) => Promise<PushTokenAnswer>;
  remove: (token: string) => Promise<undefined>;
}
