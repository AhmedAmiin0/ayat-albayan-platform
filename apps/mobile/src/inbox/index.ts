export { ErrorLine } from '@/core/ui/feedback/ErrorLine';
export { InboxScreen } from './screens/InboxScreen';
export { LeadDetailScreen } from './screens/LeadDetailScreen';
export { ThreadScreen } from './screens/ThreadScreen';
// docs/38: an Android share. The root /share gate hands it to its tree's chooser in the chat group.
export { ShareGate } from './thread/share/screen/ShareGate';
export { ShareScreen } from './thread/share/screen/ShareScreen';
export { shareRedirect } from './thread/share/share-redirect';
export { threadHref } from './thread/hooks/thread-cache';
export { clockAt } from './shared/format';
export { StaffCalls } from './thread/calls/state/StaffCalls';
export { useInboxRealtime } from './thread/live';
// A screen over the chat (sales-subscribe «رابط دفع») fills its reply box wherever a text goes (chatMaySend).
export { appendComposerText } from './composer/draft-store';
// «بحث في الرسائل» on a student's details opened from a chat (docs/37); a sign-out's cleanup.
export { clearChatMemory, MessageSearchRow } from './thread/anchor';
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
