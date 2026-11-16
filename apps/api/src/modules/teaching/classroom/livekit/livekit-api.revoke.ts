import type { LivekitApi } from './livekit-api';
import { ignoredAnswer, LivekitError } from './livekit-twirp';

/** Nothing to publish, subscribe to or send: a removed participant is cut off before the removal. */
const NOTHING = {
  can_subscribe: false,
  can_publish: false,
  can_publish_data: false,
  can_publish_sources: [],
};

const isGone = (e: unknown): boolean => e instanceof LivekitError && e.code === 'not_found';

/**
 * «إخراج من الحلقة» (owner 2026-11-16): revoke every permission first (UpdateParticipant), then
 * disconnect (RemoveParticipant), so a removed guest hears and sends nothing even while their client
 * reconnects. Someone already gone (not_found) counts as done. Throws LivekitError otherwise.
 */
export async function revokeAndRemove(api: LivekitApi, input: { room: string; identity: string }): Promise<void> {
  const grant = { roomAdmin: true, room: input.room };
  const body = { ...input, permission: NOTHING };
  const update = { method: 'livekit.RoomService/UpdateParticipant', body, grant };
  try {
    await api.call(update, ignoredAnswer);
  } catch (e) {
    if (!isGone(e)) throw e;
  }
  await api.removeParticipant(input);
}
