import { AudioPlayer } from '@ab/web-kit/lesson-files/AudioPlayer';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import { useLessonFileUrl, useRecordingUrl } from './use-recordings';

/** «تسجيل الحلقة» in the in-page player once its signed link is in. */
export function RecordingPlayer({ studentId, id }: { studentId: string; id: string }) {
  const link = useRecordingUrl({ studentId, recordingId: id });
  return (
    <LoadState query={link} rows={1}>
      {(d) => <AudioPlayer id={id} url={d.url} label={t.lessonFiles.recording} />}
    </LoadState>
  );
}

/** A teacher's voice note in the same player. */
export function VoiceNotePlayer({ studentId, id }: { studentId: string; id: string }) {
  const link = useLessonFileUrl({ studentId, fileId: id });
  return (
    <LoadState query={link} rows={1}>
      {(d) => <AudioPlayer id={id} url={d.url} label={t.lessonFiles.kinds.voice_note} />}
    </LoadState>
  );
}
