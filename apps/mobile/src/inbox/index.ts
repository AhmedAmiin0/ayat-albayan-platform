export { ErrorLine } from '@/core/ui/feedback/ErrorLine';
export { InboxScreen } from './screens/InboxScreen';
export { LeadDetailScreen } from './screens/LeadDetailScreen';
export { ThreadScreen } from './screens/ThreadScreen';
export { threadHref } from './thread/hooks/thread-cache';
export { clockAt } from './shared/format';
export { StaffCalls } from './thread/calls/state/StaffCalls';
export { useInboxRealtime } from './thread/live';
// A screen over the chat (sales-subscribe «رابط دفع») fills its reply box wherever a text goes (chatMaySend).
export { appendComposerText, clearComposerDrafts } from './composer/draft-store';
export { chatMaySend } from './thread/hooks/chat-window';
// The meetings room (classroom/room, docs/35) wears the calls' round controls and icons.
export { RoundButton } from './thread/calls/screen/RoundButton';
export {
  CameraIcon,
  CameraOffIcon,
  HangUpIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  SpeakerIcon,
  SwitchCameraIcon,
} from './thread/calls/screen/call-icons';
