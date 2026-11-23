import type { ChannelMediaPort } from '@ab/mobile-kit';
import { useDeviceChannelMedia } from '@ab/mobile-kit/channel/media';
import { pickChannelCamera, pickChannelPhoto } from './channel-pickers';

/** The staff app's photos come through the receipts' picker (compressed, no EXIF). */
const RECEIPT_PHOTOS = { pickPhoto: pickChannelPhoto, pickCamera: pickChannelCamera };

/**
 * The staff phone's media for the student chat: the kit's device port (PDF picker, microphone,
 * voice player) with the receipts' photo pickers.
 */
export const useStaffChannelMedia = (): ChannelMediaPort => useDeviceChannelMedia(RECEIPT_PHOTOS);
