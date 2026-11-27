import { AudioPlayer, Section, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { createAudioSource } from '@/recordings/player/expo-audio-source';
import type { LessonRecordingProps } from './LessonRecording.types';
import { useLessonRecording } from './use-lesson-recording';

export function LessonRecording({ studentId, recordingId, title }: LessonRecordingProps) {
  const { link } = useLessonRecording({ studentId, recordingId });
  return (
    <Section title={title || t.lessonFiles.recording}>
      <LoadState query={link}>
        {(data) => <AudioPlayer id={recordingId} url={data.url} createSource={createAudioSource} />}
      </LoadState>
    </Section>
  );
}
