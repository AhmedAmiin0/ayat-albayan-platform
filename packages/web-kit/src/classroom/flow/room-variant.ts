import type { JoinRole } from '@ab/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/**
 * Who the room is for. ONE room (ClassroomRoom / LiveRoom / ControlBar) serves the staff pages and
 * the family portal: the family's extras are switched on here, never forked.
 */
export type RoomVariant = 'staff' | 'family';

export interface RoomFeatures {
  /** Camera and microphone preview before connecting. */
  deviceCheck: boolean;
  /** Confirm before leaving. */
  confirmLeave: boolean;
  /** Alone in the room: waiting for the teacher, own camera in the corner. */
  waitStage: boolean;
  /** The teacher's camera takes the stage, everyone else the strip. */
  spotlightTeacher: boolean;
  /** Chat and participants in a side panel (wide) or a bottom sheet (phones). */
  sidePanel: boolean;
  /** Phones: round buttons with their short words under them (the app's look). */
  roundControls: boolean;
  /** The stage's camera strip: 160px tiles on every width (staff: 128px on phones). */
  wideStrip: boolean;
}

export const ROOM_VARIANTS: Readonly<Record<RoomVariant, RoomFeatures>> = {
  staff: {
    deviceCheck: false,
    confirmLeave: false,
    waitStage: false,
    spotlightTeacher: false,
    sidePanel: false,
    roundControls: false,
    wideStrip: false,
  },
  family: {
    deviceCheck: true,
    confirmLeave: true,
    waitStage: true,
    spotlightTeacher: true,
    sidePanel: true,
    roundControls: true,
    wideStrip: true,
  },
};

/** The family's token is a guest's, but the family reads the student role word. */
const FAMILY_ROLES: Partial<Record<JoinRole, string>> = { guest: t.studentChannel.roles.student };

export function roleWord(variant: RoomVariant, role: JoinRole | null): string {
  if (role === null) return '';
  const own = variant === 'family' ? FAMILY_ROLES[role] : undefined;
  return own ?? t.classroom.roles[role];
}
