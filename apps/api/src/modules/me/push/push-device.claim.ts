import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { Db } from '../../../common/db/db.module';
import { DEVICE_IN_USE, deviceKeyHash, mintDeviceKey } from '../../../common/push/expo/push-claim';
import { dbError } from '../../../common/http/http';

export interface DeviceClaim {
  userId: string;
  token: string;
  /** The key this device got on its last registration (registerPush keeps it); absent = none yet. */
  deviceKey?: string | undefined;
}

/**
 * Binds `token` to the caller's session and returns the device key it now carries, in ONE locked
 * statement (migration 730's claim_push_device, the mayClaimDevice rule): 409 when the token is
 * bound to ANOTHER profile's live session and the request does not carry that binding's key (the
 * binding stays, contested: no push until its holder registers it again, since the phone may be in
 * the caller's hands now); 401 when the caller's session ended meanwhile. The key is kept when the
 * device proved it, else the fresh one minted here replaces the old holder's.
 */
export async function claimDevice(db: Db, claim: DeviceClaim & { sessionId: string }): Promise<string> {
  const fresh = mintDeviceKey();
  const { data, error } = await db.rpc('claim_push_device', {
    p_token: claim.token,
    p_profile: claim.userId,
    p_session: claim.sessionId,
    p_new_hash: deviceKeyHash(fresh),
    ...(claim.deviceKey ? { p_presented: deviceKeyHash(claim.deviceKey) } : {}),
  });
  if (error) throw dbError(error);
  if (data === 'no_session') throw new UnauthorizedException('no_session');
  if (data === 'in_use') throw new ConflictException(DEVICE_IN_USE);
  if (data !== 'bound' && data !== 'proven') throw new Error(`claim_push_device: ${String(data)}`);
  return data === 'proven' && claim.deviceKey ? claim.deviceKey : fresh;
}
