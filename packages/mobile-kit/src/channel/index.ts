// The student channel (docs/31 §2): the staff app's teacher and monitor screens and the family
// app's chat render the same screen; the thread alone mounts in a sheet (the lesson room).
export { ChannelScreen } from './ChannelScreen';
export { ChannelThread } from './ChannelThread';
export { ChannelSheetHeader } from './header/ChannelSheetHeader';
export { TEACHER_CHANNELS_KEY } from './channel-api';
export type {
  ChannelMediaPort,
  ChannelPickedFile,
  ChannelRecorder,
  ChannelVoicePlayer,
  ChannelVoiceStatus,
} from './media-port';
