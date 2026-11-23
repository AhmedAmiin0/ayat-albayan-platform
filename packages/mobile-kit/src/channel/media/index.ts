// The student chat's phone media (the kit's ChannelMediaPort over expo-audio and the pickers),
// shared by both apps. A subpath, not the kit's index: it loads the native media modules.
export { pickChannelImage, pickChannelPdf } from './channel-pickers';
export { createChannelRecorder, playChannelVoice } from './channel-voice';
export { type PhotoPickers, useDeviceChannelMedia } from './use-device-channel-media';
