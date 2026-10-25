import { ConflictException } from '@nestjs/common';
import type { Db } from '../../common/db/db.module';
import { DEVICE_IN_USE, deviceKeyHash, mayClaimDevice, mintDeviceKey } from '../../common/push/push-claim';
import { liveSessions } from '../../common/push/push.sessions';
import { dbError } from '../teachers/http';

export interface DeviceClaim {
  userId: string;
  token: string;
  /** The key this device got on its last registration (registerPush keeps it); absent = none yet. */
  deviceKey?: string | undefined;
}

/**
 * The device key the binding of `token` to the caller will carry, or 409 when the token is bound to
 * ANOTHER profile's live session and the request does not carry that binding's key (mayClaimDevice).
 * The key is kept when the device proved it, else a new one is minted (the old holder's is void).
 * ponytail: read-then-upsert, not one statement; a race only replays this same check. Upgrade: an RPC.
 */
export async function claimDeviceKey(db: Db, claim: DeviceClaim): Promise<string> {
  const { data, error } = await db
    .from('push_device_sessions')
    .select('profile_id, session_id, device_key_hash')
    .eq('token', claim.token)
    .maybeSingle();
  if (error) throw dbError(error);
  const presented = claim.deviceKey ? deviceKeyHash(claim.deviceKey) : null;
  const proven = !!data?.device_key_hash && presented === data.device_key_hash;
  if (data && data.profile_id !== claim.userId && !proven) {
    const live = (await liveSessions(db, [data.session_id])).has(data.session_id);
    if (!mayClaimDevice(claim.userId, { profileId: data.profile_id, live, proven })) {
      throw new ConflictException(DEVICE_IN_USE);
    }
  }
  return proven && claim.deviceKey ? claim.deviceKey : mintDeviceKey();
}
