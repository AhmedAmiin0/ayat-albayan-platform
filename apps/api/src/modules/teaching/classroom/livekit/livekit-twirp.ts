import { z } from 'zod';
import type { ErrorTable } from '@/common/infra/http/errors';
import type { HttpFailure } from '@/common/infra/http/failure';

// LiveKit's Twirp API as data (docs/36 h5): its error body, its error table and one answer schema
// per method. An answer that does not match reads as empty, as the old `parseObject` did ({}).

/** A non-2xx Twirp answer; `code` is Twirp's error code (e.g. not_found). */
export class LivekitError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`livekit ${status} ${code}`);
  }
}

/** Twirp's error body ({ code, msg }); any other body is code 'unknown'. */
export const twirpErrorSchema = z.looseObject({ code: z.string() });

const statusOf = (f: HttpFailure): number =>
  f.kind === 'status' || f.kind === 'shape' ? f.status : 502;

function codeOf(f: HttpFailure): string {
  const parsed = twirpErrorSchema.safeParse(f.kind === 'status' ? f.body : null);
  return parsed.success ? parsed.data.code : 'unknown';
}

/**
 * Today's mapping: any non-2xx → LivekitError(status, Twirp code). A transport failure stays a
 * plain Error, as fetch's own TypeError was. New (none before): the deadline → LivekitError 504.
 */
export const TWIRP_ERRORS: ErrorTable<Error> = {
  timeout: () => new LivekitError(504, 'timeout'),
  network: () => new Error('livekit: network'),
  default: (f) => new LivekitError(statusOf(f), codeOf(f)),
};

const list = z.array(z.unknown()).catch([]);

/** RemoveParticipant, UpdateParticipant, CreateRoom, DeleteRoom, MutePublishedTrack, StopEgress. */
export const ignoredAnswer = z.unknown();
/** GetParticipant: its published tracks (read by trackSidOf). */
export const participantAnswer = z.looseObject({ tracks: list }).catch({ tracks: [] });
/** ListParticipants (read by peopleIn). */
export const participantsAnswer = z.looseObject({ participants: list }).catch({ participants: [] });
/** ListRooms (read by liveRooms). */
export const roomsAnswer = z.looseObject({ rooms: list }).catch({ rooms: [] });
/** StartRoomCompositeEgress: an EgressInfo (read by egressIdOf; camelCase tolerated). */
export const egressAnswer = z
  .looseObject({ egress_id: z.unknown().optional(), egressId: z.unknown().optional() })
  .catch({});
