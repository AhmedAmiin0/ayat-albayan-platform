import type { RecordingEnv } from '../../env.recording';

/**
 * Object name of a recording in the `recordings` bucket: lessons/<lesson id>/<UTC timestamp>.mp4
 * (a lesson may have several when the room closed and opened again).
 */
export function recordingPath(lessonId: string, now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `lessons/${lessonId}/${stamp}.mp4`;
}

/**
 * Body of livekit.Egress/StartRoomCompositeEgress (proto field names, which Twirp's JSON accepts):
 * the whole room in the grid layout, one MP4 uploaded to Supabase Storage through its S3 endpoint
 * (path-style addressing, as Supabase requires).
 */
export function egressRequest(input: { room: string; filepath: string; s3: RecordingEnv }): object {
  const { s3 } = input;
  return {
    room_name: input.room,
    layout: 'grid',
    file_outputs: [
      {
        file_type: 'MP4',
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
