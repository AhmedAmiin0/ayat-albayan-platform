import type { PortalKind, PortalStudent } from '@ab/shared';
import type { PublicSettingKey } from '@ab/settings';
import { z } from 'zod';

// Who sees what in the family portal (docs/50 §2, §4): a guardian and an adult student who is
// their own contact see the package and its money; a child's own login never does (nor asks).
// The teacher chat shows to every family login, a child's too, while
// settings.family_chat_enabled is on.

export type PortalViewer = 'guardian' | 'adult' | 'child';

/** A login that is not its student's own contact: the guardian, or a child's own login. */
const BY_KIND: Readonly<Record<PortalKind, PortalViewer>> = {
  guardian: 'guardian',
  student: 'child',
};

/**
 * The student's contact_is_self first: an adult who registered themselves reads
 * as an adult whichever path they signed in by (a guardian who also studies, too); else the
 * login's kind (GET /portal/me).
 */
export function portalViewer(
  kind: PortalKind,
  student: Pick<PortalStudent, 'contact_is_self'>,
): PortalViewer {
  return student.contact_is_self ? 'adult' : BY_KIND[kind];
}

/** The page reads in its own words («أهلًا بك», «حضرتها», «حلقتك القادمة»): never a guardian's. */
const READS_OWN: Readonly<Record<PortalViewer, boolean>> = {
  guardian: false,
  adult: true,
  child: true,
};

export const readsOwn = (viewer: PortalViewer): boolean => READS_OWN[viewer];

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
export const CHILD_TABS = ['upcoming', 'attended', 'absent', 'recordings', 'package', 'chat'] as const;
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
    recordings: true,
    package: seesMoney(portalViewer(kind, student)),
    chat: chatOn,
  };
  return CHILD_TABS.filter((tab) => shown[tab]);
}
