import type { RecordingEnv } from '../../config/env/env.recording';
import type { RoomTarget } from './recording-target';

/**
 * Object name of a recording in the `recordings` bucket: lessons/<lesson id>/<UTC timestamp>.mp3,
 * or meetings/<meeting id>/… (a room may have several when it closed and opened again).
 * Rows from before 2026-10-06 end in .mp4 (video); `mediaOfPath` (@ab/shared) tells them apart.
 */
export function recordingPath(target: RoomTarget, now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `${target.kind}s/${target.id}/${stamp}.mp3`;
}

/** 64 kbps CBR: about 29 MB per hour of lesson (egress's default 128 kbps would double it). */
const AUDIO_KBPS = 64;

/**
 * Body of livekit.Egress/StartRoomCompositeEgress (proto field names, which Twirp's JSON accepts):
 * the whole room mixed into one audio file, uploaded to Supabase Storage through its S3 endpoint
 * (path-style addressing, as Supabase requires).
 *
 * Audio only, owner decision 2026-10-06 (2 vCPUs shared with LiveKit, the API and the CRM).
 * `audio_only` with no `layout` and no `custom_base_url` makes egress use its SDK source, no
 * headless Chrome (egress pkg/config/pipeline.go ShouldUseSDKSource; default since v1.13.0).
 * MP3 because it plays in every target browser, iOS Safari of any version included; OGG/Opus only
 * from iOS 18.4 (caniuse). Not MP4/AAC: egress forces the .mp4 extension (an .m4a name would be
 * stored as .m4a.mp4), and .mp4 means video for the old rows. Egress uploads it as audio/mpeg.
 */
export function egressRequest(input: { room: string; filepath: string; s3: RecordingEnv }): object {
  const { s3 } = input;
  return {
    room_name: input.room,
    audio_only: true,
    advanced: { audio_bitrate: AUDIO_KBPS },
    file_outputs: [
      {
        file_type: 'MP3',
        filepath: input.filepath,
        s3: {
          access_key: s3.accessKey,
          secret: s3.secret,
          region: s3.region,
          endpoint: s3.endpoint,
          bucket: s3.bucket,
          force_path_style: true,
        },
      },
    ],
  };
}

/** The egress id of an EgressInfo answer (snake_case from Twirp, camelCase tolerated). */
export function egressIdOf(info: Record<string, unknown>): string | null {
  const id = info.egress_id ?? info.egressId;
  return typeof id === 'string' && id ? id : null;
}
