import type { IconName } from '#/components/ui/display/index.ts';
import { t } from '#/lib/i18n/index.ts';
import type { RoomVariant } from '#/classroom/flow/room-variant.ts';
import type { RoomStatus } from '#/classroom/room/components/room-types.ts';

/**
 * Why the call is over (the app's RoomEnd, boards FamRoomWebLeft / FamRoomWebEnded):
 * - `left`: left on purpose, or the connection went: the lesson may still run, so «ادخل مرة أخرى»;
 * - `closed`: LiveKit closed the room (the teacher ended it, or the server's closer): a rejoin
 *   tells whether it is final;
 * - `final`: a rejoin came back 410 lesson_ended: «انتهت الحلقة», only «رجوع»;
 * - `removed` / `duplicate`: the teacher removed this person / the same join opened elsewhere;
 * - `failed`: could not connect (its own words).
 */
export type ClosingKind = 'left' | 'closed' | 'final' | 'removed' | 'duplicate' | 'failed';

export interface ClosingSpec {
  icon: IconName;
  title: string;
  body: string | null;
  /** «ادخل مرة أخرى» makes sense (the page passed a rejoin). */
  rejoin: boolean;
  /** Who is in the room now (the page's presence line). */
  presence: boolean;
}

export const CLOSINGS: Readonly<Record<ClosingKind, ClosingSpec>> = {
  left: { icon: 'logout', title: t.classroom.ended, body: t.mobileRoom.left.body, rejoin: true, presence: true },
  closed: { icon: 'check', title: t.classroom.closedHint, body: null, rejoin: true, presence: false },
  final: { icon: 'check', title: t.classroom.closedHint, body: t.roomFlow.ended.body, rejoin: false, presence: false },
  removed: { icon: 'x', title: t.classroom.error.removed_from_room, body: null, rejoin: false, presence: false },
  duplicate: { icon: 'x', title: t.classroom.error.duplicate, body: null, rejoin: false, presence: false },
  failed: { icon: 'x', title: t.classroom.error.connect_failed, body: null, rejoin: true, presence: false },
};

/**
 * Staff keep their plain screens: «خرجت من الحلقة» with «ادخل مرة أخرى» after leaving and after
 * «إنهاء الحلقة للجميع» alike, and never the family's «الحلقة ما زالت جارية…» line.
 */
const STAFF_LEFT: ClosingSpec = { ...CLOSINGS.left, body: null, presence: false };
const BY_VARIANT: Readonly<Record<RoomVariant, Partial<Record<ClosingKind, ClosingSpec>>>> = {
  staff: { left: STAFF_LEFT, closed: STAFF_LEFT },
  family: {},
};

/** The closing screen's look and words for this room's variant. */
export const closingSpec = (kind: ClosingKind, variant: RoomVariant): ClosingSpec =>
  BY_VARIANT[variant][kind] ?? CLOSINGS[kind];

const BY_STATUS: Readonly<Partial<Record<RoomStatus, ClosingKind>>> = {
  ended: 'left',
  closed: 'closed',
  duplicate: 'duplicate',
  removed: 'removed',
};

export interface ClosingInput {
  status: RoomStatus;
  failure: string | null;
  /** The page's rejoin was refused with 410 lesson_ended. */
  endedForAll: boolean;
}

/** The closing screen to show, or null while the call goes on. The page's final word wins. */
export function closingOf({ status, failure, endedForAll }: ClosingInput): ClosingKind | null {
  if (endedForAll) return 'final';
  return failure === null ? (BY_STATUS[status] ?? null) : 'failed';
}
