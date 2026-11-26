import { useLessonFileUrl } from '@/recordings/use-assets';
import type { VoiceNoteProps } from './VoiceNote.types';

export function useVoiceNote({ studentId, fileId }: Pick<VoiceNoteProps, 'studentId' | 'fileId'>) {
  const link = useLessonFileUrl({ studentId, fileId });
  return { link };
}
