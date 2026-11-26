import { useRecordingUrl } from '@/recordings/use-assets';
import type { LessonRecordingProps } from './LessonRecording.types';

export function useLessonRecording({
  studentId,
  recordingId,
}: Pick<LessonRecordingProps, 'studentId' | 'recordingId'>) {
  const link = useRecordingUrl({ studentId, recordingId });
  return { link };
}
