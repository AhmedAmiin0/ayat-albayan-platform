import type { ReactNode } from 'react';
import { ROOM_VARIANTS, type RoomFeatures, type RoomVariant } from './room-variant';

/** What the page that opened the room knows about the lesson (the portal card; staff: nothing). */
export interface RoomContext {
  title: string;
  subtitle?: string | undefined;
  /** The countdown to the start. */
  waiting?: ReactNode;
  /** Who is in the room now. */
  presence?: ReactNode;
}

/** The family's in-room chat is the student channel; `locked` on a trial (join.chat false). */
export interface RoomChatSlot {
  unread: number;
  locked: boolean;
  body: ReactNode;
}

/** The room's variant and what its page passed in. */
export interface RoomKit {
  variant: RoomVariant;
  features: RoomFeatures;
  context: RoomContext | null;
  chat: RoomChatSlot | null;
}

export interface RoomKitInput {
  variant?: RoomVariant | undefined;
  context?: RoomContext | undefined;
  chat?: RoomChatSlot | null | undefined;
}

export function roomKit({ variant = 'staff', context, chat }: RoomKitInput): RoomKit {
  const features = ROOM_VARIANTS[variant];
  return { variant, features, context: context ?? null, chat: chat ?? null };
}

export const STAFF_KIT: RoomKit = roomKit({});
