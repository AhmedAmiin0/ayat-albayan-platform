import type { JoinRole } from '@ab/shared';
import { t } from '#/lib/i18n/index.ts';

/**
 * Who the room is for. ONE room (ClassroomRoom / LiveRoom / ControlBar) serves the staff pages and
 * the family portal (owner 2026-11-19): the family's extras are switched on here, never forked.
 */
export type RoomVariant = 'staff' | 'family';

export interface RoomFeatures {
  /** «قبل الدخول»: camera and microphone preview before connecting. */
  deviceCheck: boolean;
  /** «تغادر الحلقة؟» before leaving. */
  confirmLeave: boolean;
  /** Alone in the room: «بانتظار المعلم/ة…» with one's own camera in the corner. */
  waitStage: boolean;
  /** The teacher's camera takes the stage, everyone else the strip. */
  spotlightTeacher: boolean;
  /** «المحادثة» and «المشاركون» in a side panel (wide) or a bottom sheet (phones). */
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

/** The role word under a name. The family's token is a guest's, but the family reads «الطالب». */
const FAMILY_ROLES: Partial<Record<JoinRole, string>> = { guest: t.studentChannel.roles.student };

export function roleWord(variant: RoomVariant, role: JoinRole | null): string {
  if (role === null) return '';
  const own = variant === 'family' ? FAMILY_ROLES[role] : undefined;
  return own ?? t.classroom.roles[role];
}
