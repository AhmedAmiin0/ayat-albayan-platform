import { lessonJoinRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { GuestJoinCalls } from './join-calls.types';

/** A lesson's guest link on a public api client; answers parsed strictly. */
export function guestJoinCalls(client: ApiClient): GuestJoinCalls {
  const call = callWith(client);
  return {
    join: ({ linkToken, name }) =>
      call({ route: lessonJoinRoutes.guestJoin, params: { linkToken }, body: { name } }),
  };
}
