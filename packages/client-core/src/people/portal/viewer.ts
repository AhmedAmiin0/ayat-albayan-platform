import type { PortalKind, PortalStudent, PublicSettingKey } from '@ab/shared';
import { z } from 'zod';

// Who sees what in the family portal (docs/50 §2, §4): a guardian and an adult student who is
// their own contact see the package and its money; a child's own login never does (nor asks).
// The teacher chat shows to every family login, a child's too (owner 2026-11-16), while
// settings.family_chat_enabled is on.

export type PortalViewer = 'guardian' | 'adult' | 'child';

const STUDENT_VIEWER: Readonly<Record<'self' | 'child', PortalViewer>> = {
  self: 'adult',
  child: 'child',
};

/** The login's kind (GET /portal/me) and the student's contact_is_self. */
export function portalViewer(
  kind: PortalKind,
  student: Pick<PortalStudent, 'contact_is_self'>,
): PortalViewer {
  const viewer: Record<PortalKind, PortalViewer> = {
    guardian: 'guardian',
    student: STUDENT_VIEWER[student.contact_is_self ? 'self' : 'child'],
  };
  return viewer[kind];
}

/** Price, amount due, payments and the package screen: never a child's (anti-goal, docs/50 §4). */
const SEES_MONEY: Readonly<Record<PortalViewer, boolean>> = {
  guardian: true,
  adult: true,
  child: false,
};

export const seesMoney = (viewer: PortalViewer): boolean => SEES_MONEY[viewer];

/** A public bool from GET /settings/public: on only when it is exactly true (unknown = off). */
const publicFlag = (key: PublicSettingKey): ((publicConfig: unknown) => boolean) => {
  const on = z.object({ [key]: z.literal(true) });
  return (publicConfig) => on.safeParse(publicConfig).success;
};

/** The public setting's key (packages/settings, public: true, default false). */
export const FAMILY_CHAT_SETTING = 'family_chat_enabled';

/** settings.family_chat_enabled; off while unknown (its default). */
export const familyChatOn = publicFlag(FAMILY_CHAT_SETTING);

/** The room inside the family app (packages/settings, public: true, default false). */
export const FAMILY_MEETINGS_SETTING = 'family_meetings_in_app';

/** settings.family_meetings_in_app; off (the browser) while unknown. */
export const familyMeetingsOn = publicFlag(FAMILY_MEETINGS_SETTING);

/** The child screen's tabs, in order (docs/50 §6). */
export const CHILD_TABS = ['upcoming', 'attended', 'absent', 'package', 'chat'] as const;
export type ChildTab = (typeof CHILD_TABS)[number];

export interface ChildTabsInput {
  kind: PortalKind;
  student: Pick<PortalStudent, 'contact_is_self'>;
  /** settings.family_chat_enabled (familyChatOn). */
  chatOn: boolean;
}

/** Which tabs this login sees for this student. */
export function childTabs({ kind, student, chatOn }: ChildTabsInput): ChildTab[] {
  const shown: Record<ChildTab, boolean> = {
    upcoming: true,
    attended: true,
    absent: true,
    package: seesMoney(portalViewer(kind, student)),
    chat: chatOn,
  };
  return CHILD_TABS.filter((tab) => shown[tab]);
}
