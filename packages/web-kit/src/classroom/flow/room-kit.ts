import type { ReactNode } from 'react';
import { ROOM_VARIANTS, type RoomFeatures, type RoomVariant } from './room-variant';

/** What the page that opened the room knows about the lesson (the portal card; staff: nothing). */
export interface RoomContext {
  /** «حلقة يوسف مع أ. فاطمة». */
  title: string;
  /** «6:30 – 7:15 م». */
  subtitle?: string | undefined;
  /** Under «بانتظار المعلم/ة…»: the countdown to the start. */
  waiting?: ReactNode;
  /** On «خرجت من الحلقة»: who is in the room now. */
  presence?: ReactNode;
}

/**
 * The family's in-room «المحادثة»: THE student channel (the app's room chat, use-family-room-chat),
 * its unread count, and `locked` on a trial lesson (join.chat false: the panel explains instead).
 */
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
