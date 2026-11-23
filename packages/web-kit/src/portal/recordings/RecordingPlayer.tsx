import type { PortalRecording } from '@ab/shared';
import type { ReactNode } from 'react';
import { AudioPlayer, VideoPlayer } from '#/lesson-files/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { QueryState } from '#/components/ui/index.ts';
import { useLessonFileUrl, useRecordingUrl } from './use-recordings';

interface Played {
  id: string;
  url: string;
  /** The student's code over a video's picture. */
  code: string;
}

/** An audio recording in the audio player; a video one (before 2026-10-06) with its picture. */
const PLAYER: Record<PortalRecording['media'], (p: Played) => ReactNode> = {
  audio: ({ id, url }) => <AudioPlayer id={id} url={url} label={t.lessonFiles.recording} />,
  video: ({ id, url, code }) => (
    <VideoPlayer id={id} url={url} label={t.lessonFiles.recording} watermark={code} />
  ),
};

interface Props {
  studentId: string;
  recording: Pick<PortalRecording, 'id' | 'media'>;
  code: string;
}

/** «تسجيل الحلقة» in the in-page player once its signed link is in. */
export function RecordingPlayer({ studentId, recording, code }: Props) {
  const link = useRecordingUrl({ studentId, recordingId: recording.id });
  return (
    <QueryState query={link} rows={1}>
      {(d) => PLAYER[recording.media]({ id: recording.id, url: d.url, code })}
    </QueryState>
  );
}

/** A teacher's voice note in the same player. */
export function VoiceNotePlayer({ studentId, id }: { studentId: string; id: string }) {
  const link = useLessonFileUrl({ studentId, fileId: id });
  return (
    <QueryState query={link} rows={1}>
      {(d) => <AudioPlayer id={id} url={d.url} label={t.lessonFiles.kinds.voice_note} />}
    </QueryState>
  );
}
