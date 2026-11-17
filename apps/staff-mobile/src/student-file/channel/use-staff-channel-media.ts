import type { ChannelMediaPort } from '@ab/mobile-kit';
import { useEffect, useState } from 'react';
import { pickChannelPdf, pickChannelPhoto } from './channel-pickers';
import { createChannelRecorder, playChannelVoice } from './channel-voice';

/**
 * The staff phone's media for the student chat (the kit's ChannelMediaPort): the photo and PDF
 * pickers, the microphone and the voice player. Leaving the chat mid-recording drops the note.
 */
export function useStaffChannelMedia(): ChannelMediaPort {
  const [recorder] = useState(createChannelRecorder);
  useEffect(() => () => recorder.cancel(), [recorder]);
  return {
    pickPhoto: pickChannelPhoto,
    pickPdf: pickChannelPdf,
    recorder,
    playVoice: playChannelVoice,
  };
}
