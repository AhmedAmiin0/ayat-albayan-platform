import { AudioPlayer, Section, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { createAudioSource } from '@/recordings/player/expo-audio-source';
import { useRecordingUrl } from '@/recordings/use-assets';

interface LessonRecordingProps {
  studentId: string;
  recordingId: string;
  title: string;
}

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
