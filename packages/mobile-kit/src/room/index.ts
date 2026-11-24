// The in-app lesson room (docs/35; owner 2026-11-16: the staff room, moved, mounted by both
// apps): the screen, the native LiveKit platform, the token handoff and the shared types. Each app
// injects its own join, host powers, chat sheet, browser page and back source.
export { RoomScreen, type RoomChat, type RoomScreenProps } from './screen/RoomScreen';
export { RoomNotice } from './screen/RoomNotice';
export type { BackSource, BeforeRemove } from './screen/use-leave-guard';
export { nativeRoomQuery, useNativeRoom } from './native/native-room-query';
export { liveKitNative } from './native/livekit-native';
export { credentialsOf, handOff, takeHandoff } from './model/join-handoff';
export type {
  MediaWish,
  RoomCredentials,
  RoomKind,
  RoomPlatform,
  RoomTarget,
} from './model/room-types';
export type { RoomHost } from './host/host-types';
export { classroomError } from './state/room-failure';
