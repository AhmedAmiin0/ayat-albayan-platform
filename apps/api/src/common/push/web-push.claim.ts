import { ConflictException } from '@nestjs/common';
import { dbError } from '../http/http';
import type { Db } from '../db/db.module';
import { DEVICE_IN_USE, mayClaimDevice } from './push-claim';
import { liveSessions } from './push.sessions';
import type { WebPushSubscriptionInput } from './web-push.endpoint';

/**
 * PUT /me/web-push: 409 when the endpoint is a browser bound to ANOTHER profile's live session and
 * the request does not carry that subscription's own keys (mayClaimDevice). The same browser signed
 * in as someone else re-sends its PushSubscription unchanged (same p256dh and auth secret, which
 * only its holder can read), so it moves; an endpoint alone never does. A row from before migration
 * 700 (no session) is not live: the API never pushes to it anyway.
 */
export async function assertBrowserClaim(db: Db, input: { profileId: string; sub: WebPushSubscriptionInput }): Promise<void> {
  const { data, error } = await db
    .from('web_push_subscriptions')
    .select('profile_id, session_id, p256dh, auth')
    .eq('endpoint', input.sub.endpoint)
    .maybeSingle();
  if (error) throw dbError(error);
  if (!data || data.profile_id === input.profileId) return;
  const proven = data.p256dh === input.sub.keys.p256dh && data.auth === input.sub.keys.auth;
  const live = !proven && data.session_id !== null && (await liveSessions(db, [data.session_id])).has(data.session_id);
  if (!mayClaimDevice(input.profileId, { profileId: data.profile_id, live, proven })) {
    throw new ConflictException(DEVICE_IN_USE);
  }
}
