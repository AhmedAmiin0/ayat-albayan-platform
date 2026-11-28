import { z } from 'zod';

/** LiveKit identities the API mints: `<role>-<12 hex>` (newIdentity). */
export const participantIdentitySchema = z.string().regex(/^[a-z]+-[0-9a-f]{12}$/);

export const ROOM_RECORDING_STATES = ['recording', 'done', 'failed'] as const;
export const roomRecordingStateSchema = z.enum(ROOM_RECORDING_STATES);
export type RoomRecordingState = z.infer<typeof roomRecordingStateSchema>;

/** A room's recording (LiveKit egress, room composite MP4 in Supabase Storage). */
export const lessonRecordingViewSchema = z.object({
  id: z.string(),
  status: roomRecordingStateSchema,
  started_at: z.string(),
  ended_at: z.string().nullable(),
  /** Signed download link (1 h) once the file exists; null while recording or on failure. */
  url: z.string().nullable(),
});
export type LessonRecordingView = z.infer<typeof lessonRecordingViewSchema>;

/** GET /recordings/status: false = RECORDING_S3_* or LiveKit missing, rooms are not recorded. */
export const recordingStatusSchema = z.object({ configured: z.boolean() });
export type RecordingStatus = z.infer<typeof recordingStatusSchema>;
