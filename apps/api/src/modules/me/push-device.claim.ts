import { ConflictException } from '@nestjs/common';
import type { Db } from '../../common/db/db.module';
import { DEVICE_IN_USE, deviceKeyHash, mayClaimDevice, mintDeviceKey } from '../../common/push/push-claim';
import { liveSessions } from '../../common/push/push.sessions';
import { dbError } from '../../common/http/http';

export interface DeviceClaim {
  userId: string;
  token: string;
  /** The key this device got on its last registration (registerPush keeps it); absent = none yet. */
  deviceKey?: string | undefined;
}

interface Binding {
  profile_id: string;
  session_id: string;
  device_key_hash: string | null;
}

/** Did the request carry the key of this binding (the same device)? */
function proves(binding: Binding | null, deviceKey: string | undefined): boolean {
  return !!binding?.device_key_hash && !!deviceKey && deviceKeyHash(deviceKey) === binding.device_key_hash;
}

/**
 * The device key the binding of `token` to the caller will carry, or 409 when the token is bound to
 * ANOTHER profile's live session and the request does not carry that binding's key (mayClaimDevice).
 * The refused binding is marked contested (no push until its holder registers it again): the phone
 * may be in the caller's hands now, and must not keep showing the holder's alerts.
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
  const proven = proves(data, claim.deviceKey);
  if (data && data.profile_id !== claim.userId && !proven) await refuseIfLive(db, { claim, binding: data });
  return proven && claim.deviceKey ? claim.deviceKey : mintDeviceKey();
}

async function refuseIfLive(db: Db, input: { claim: DeviceClaim; binding: Binding }): Promise<void> {
  const { claim, binding } = input;
  const live = (await liveSessions(db, [binding.session_id])).has(binding.session_id);
  if (mayClaimDevice(claim.userId, { profileId: binding.profile_id, live, proven: false })) return;
  const { error } = await db
    .from('push_device_sessions')
    .update({ contested_at: new Date().toISOString() })
    .eq('token', claim.token)
    .eq('profile_id', binding.profile_id);
  if (error) throw dbError(error);
  throw new ConflictException(DEVICE_IN_USE);
}
