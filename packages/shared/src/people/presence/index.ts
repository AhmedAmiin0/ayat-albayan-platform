export { maySeePresence, type PresencePair } from './presence-rules';
export * from './presence.routes';
export {
  channelPresenceSchema,
  presencePeerSchema,
  presenceSelfSchema,
  staffPresenceRowSchema,
  staffPresenceSchema,
} from './presence.schemas';
export { presenceWhen, type PresenceWhenInput, type PresenceWords } from './presence-when';
export {
  isOnline,
  lastMessageLine,
  PRESENCE_RECENT_MS,
  PRESENCE_WATCH_MAX,
  presenceLine,
  type OnlineInput,
  type PresenceText,
} from './presence-line';
export type {
  ChannelPresence,
  PresencePeer,
  PresenceSelf,
  StaffPresence,
  StaffPresenceRow,
} from './presence.schemas';
