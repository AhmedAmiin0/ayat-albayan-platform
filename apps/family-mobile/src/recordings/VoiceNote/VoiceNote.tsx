import { AudioPlayer } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { createAudioSource } from '@/recordings/player/expo-audio-source';
import type { VoiceNoteProps } from './VoiceNote.types';
import { useVoiceNote } from './use-voice-note';

/** A teacher's voice note (an audio lesson file) in the same in-app player. */
export function VoiceNote({ studentId, fileId }: VoiceNoteProps) {
  const { link } = useVoiceNote({ studentId, fileId });
  return (
    <LoadState query={link}>
      {(data) => <AudioPlayer id={fileId} url={data.url} createSource={createAudioSource} />}
    </LoadState>
  );
}
