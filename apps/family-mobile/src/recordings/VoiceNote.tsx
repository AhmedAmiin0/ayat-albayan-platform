import { AudioPlayer } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { useLessonFileUrl } from './use-assets';

/** A teacher's voice note (an audio lesson file) in the same in-app player. */
export function VoiceNote({ studentId, fileId }: { studentId: string; fileId: string }) {
  const link = useLessonFileUrl({ studentId, fileId });
  return <LoadState query={link}>{(data) => <AudioPlayer id={fileId} url={data.url} />}</LoadState>;
}
