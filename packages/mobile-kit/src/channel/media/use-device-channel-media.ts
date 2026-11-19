import { useEffect, useState } from 'react';
import type { ChannelMediaPort, ChannelPickedFile } from '../media-port';
import { pickChannelImage, pickChannelPdf } from './channel-pickers';
import { createChannelRecorder, playChannelVoice } from './channel-voice';

type Pick = () => Promise<ChannelPickedFile | null>;

/** The photo sources; an app may bring its own (the staff app's receipts picker). */
export interface PhotoPickers {
  pickPhoto: Pick;
  pickCamera: Pick;
}

const DEVICE_PHOTOS: PhotoPickers = {
  pickPhoto: () => pickChannelImage('library'),
  pickCamera: () => pickChannelImage('camera'),
};

/**
 * The phone's media for the student chat (the kit's ChannelMediaPort): the photo, camera and PDF
 * pickers, the microphone and the voice player. Leaving the chat mid-recording drops the note.
 */
export function useDeviceChannelMedia(photos: PhotoPickers = DEVICE_PHOTOS): ChannelMediaPort {
  const [recorder] = useState(createChannelRecorder);
  useEffect(() => () => recorder.cancel(), [recorder]);
  return {
    ...photos,
    pickPdf: pickChannelPdf,
    recorder,
    playVoice: playChannelVoice,
  };
}
