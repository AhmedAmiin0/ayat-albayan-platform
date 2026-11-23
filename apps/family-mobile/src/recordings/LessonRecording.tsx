import { AudioPlayer, Section, t } from '@ab/mobile-kit';
import { LoadState } from '#/ui/index.ts';
import { createAudioSource } from './player/expo-audio-source';
import { useRecordingUrl } from './use-assets';

interface LessonRecordingProps {
  studentId: string;
  recordingId: string;
  /** «الجزء 2» when the lesson was recorded in parts; else the plain title. */
  title: string;
}

/** «تسجيل الحلقة» in the in-app player, once its signed link is in. */
export function LessonRecording({ studentId, recordingId, title }: LessonRecordingProps) {
  const link = useRecordingUrl({ studentId, recordingId });
  return (
    <Section title={title || t.lessonFiles.recording}>
      <LoadState query={link}>
        {(data) => (
          <AudioPlayer id={recordingId} url={data.url} createSource={createAudioSource} />
        )}
      </LoadState>
    </Section>
  );
}
